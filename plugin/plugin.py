#the following import is optional
#it only allows "intelligent" IDEs (like PyCharm) to support you in using it
import json
import urllib.request
import os
import time

class Plugin(object):

  @classmethod
  def pluginInfo(cls):
    """
    the description for the module
    @return: a dict with the content described below
            parts:
               * description (mandatory)
               * data: list of keys to be stored (optional)
                 * path - the key - see AVNApi.addData, all pathes starting with "gps." will be sent to the GUI
                 * description
    """
    return {
      'description': 'chargemon gui plugin',
    }
  CONFIG_HOST={
      'name':'host',
      'description':'host that runs the chargemon',
      'default':'localhost',
      'type': 'STRING'
    }
  CONFIG_PORT={
    'name':'port',
    'description': 'port that chargemon listens on',
    'default':'8081',
    'type':'NUMBER'
  }
  CONFIG_INTERVAL={
    'name':'interval',
    'description':'query interval(s)',
    'default': 5,
    'type': 'NUMBER',
    'rangeOrList':[2,3600]
  }
  CONFIG_TALKER={
    'name':'talker',
    'description':'NMEA talker id',
    'default': 'YX',
    'type': 'STRING'
  }
  CONFIG_XDR={
    'name':'sendXDR',
    'description': 'send XDR records',
    'default':True,
    'type':'BOOLEAN'
  }

  def __init__(self,api):
    """
        initialize a plugins
        do any checks here and throw an exception on error
        do not yet start any threads!
        @param api: the api to communicate with avnav
        @type  api: AVNApi
    """
    self.api = api # type: AVNApi
    self.api.registerEditableParameters([self.CONFIG_HOST,self.CONFIG_PORT, self.CONFIG_INTERVAL,self.CONFIG_XDR, self.CONFIG_TALKER],self.changeConfig)
    self.api.registerRestart(self.stop)
    self.changeSequence=0
    self.prefix='HC'

  def changeConfig(self,newValues):
    self.api.saveConfigValues(newValues)
    self.changeSequence+=1

  def stop(self):
    self.changeSequence+=1

  def __getConfig(self,item):
    return self.api.getConfigValue(item.get('name'),item.get('default'))

  def __getName(self,item):
    if item is None:
      return None
    definition=item.get('definition')
    if definition is None:
      return None
    return definition.get('name')
  
  def __addXdr(self,record,type,value,unit,name):
    if value == '##':
      return record
    rt=record if record is not None else '$%sXDR'%self.prefix
    rt+=',%s,%s,%s,%s'%(type,value,unit,name)
    return rt
  def run(self):
    """
    the run method
    this will be called after successfully instantiating an instance
    this method will be called in a separate Thread
    The example simply counts the number of NMEA records that are flowing through avnav
    and writes them to the store every 10 records
    @return:
    """
    self.api.log("started")
    self.api.setStatus('STARTED','running')
    count=0
    lastQuery=0
    userApp=None
    userAppSequence=None
    queryUrl=None
    while not self.api.shouldStopMainThread():
      self.prefix=self.__getConfig(self.CONFIG_TALKER)
      if userApp is None or userAppSequence != self.changeSequence:
        if userApp is not None:
          try:
            self.api.dergisterUserApp(userApp)
          except:
            pass
          userApp=None
        userAppSequence=self.changeSequence
        host=self.__getConfig(self.CONFIG_HOST)
        port=self.__getConfig(self.CONFIG_PORT)
        queryUrl='http://%s:%s/control/command?cmd=state'%(host,str(port))
        if host == 'localhost':
          host='$HOST'
        url='http://%s:%s'%(host,port)
        userApp=self.api.registerUserApp(url,'icon.svg')
      sequence=self.changeSequence
      interval=self.__getConfig(self.CONFIG_INTERVAL)
      interval=float(interval)
      now=time.monotonic()
      if lastQuery is None:
        lastQuery= now - interval -1 #ensure immediate at beginning
      #wait for next query interval
      #use monotonic timer to cope with time changes
      while now < (lastQuery + interval) and sequence == self.changeSequence:
        if self.api.shouldStopMainThread():
          break
        time.sleep(0.5)
        now=time.monotonic()
      if self.api.shouldStopMainThread():
        break
      lastQuery=now
      if queryUrl is None:
        self.api.setStatus('ERROR',"no url")
        continue
      try:
        response=urllib.request.urlopen(queryUrl)
        if response is None:
          raise Exception("empty response")
        data=json.loads(response.read())
        if data.get('status') != 'OK':
          info=data.get('info') or ''
          raise Exception('status:%s %s'%(data.get('status') or '',info))
        count+=1
        self.api.setStatus("NMEA","(%d) %s"%(count,time.strftime("%Y/%m/%d %H:%M:%S",time.localtime())))
        doSend=self.__getConfig(self.CONFIG_XDR)
        if str(doSend).upper() == 'TRUE':
          record=None
          for item in data.get('data'):
            if self.__getName(item) == 'V':
              record=self.__addXdr(record,'U',item.get('value'),'V','BatteryVolt')
            if self.__getName(item) == 'VPV':
              record=self.__addXdr(record,'U',item.get('value'),'V','PanelVolt')
            if self.__getName(item) == 'I':
              record=self.__addXdr(record,'I',item.get('value'),'A','ChargeCurrent')
            if self.__getName(item) == 'PPV':
              record=self.__addXdr(record,'G',item.get('value'),'W','PanelPower')
          if record is not None:
            self.api.addNMEA( record,addCheckSum=True,omitDecode=False)
      except Exception as e:
        count=0
        self.api.setStatus("ERROR","unable to fetch %s: %s"%(queryUrl,str(e)))

