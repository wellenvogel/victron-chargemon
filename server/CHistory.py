import datetime
import logging
import os

import Constants


class ValueHolder:

  def __init__(self,valueHash):
    self.values=valueHash
  def getValueByName(self,name):
    return self.values.get(name)

class CHistory:
  DATEHEADER='date'
  MAXDAYS=50
  def __init__(self,basedir,interval,headline):
    self.basedir=basedir
    self.interval=interval
    self.headline=[self.DATEHEADER]+headline
    self.currentFile=None
    self.currentFileName=None
    self.logger = logging.getLogger(Constants.LOGNAME)


  def getFilename(self,date=None):
    if date is None:
      date=datetime.datetime.now()
    return os.path.join(self.basedir,str('history'+date.strftime("%Y-%m-%d")))

  def getFileForDay(self,distance=0):
    """
    get a filename that is distance days away from today
    :param distance:
    :return:
    """
    date = datetime.datetime.now()
    date += datetime.timedelta(days=distance)
    return self.getFilename(date)


  def __writeHeadline(self):
    self.currentFile.write(",".join(self.headline))
    self.currentFile.write("\n")
  def checkOpenFile(self):
    newName=self.getFilename()
    if newName != self.currentFileName:
      self.logger.info("opening new history file %s",newName)
      if self.currentFile is not None:
        self.currentFile.close()
        self.currentFile=None
      if os.path.exists(newName):
        self.migrateFile(newName)
      else:
        self.currentFile=open(newName,'w')
        self.__writeHeadline()
        self.currentFile.flush()
      self.currentFileName=newName
      self.logger.info("opened new history file %s",newName)

  def writeValuesFromState(self,stateResponse,doCheck=True):
    if doCheck:
      self.checkOpenFile()
    line=[]
    for key in self.headline:
      if key == self.DATEHEADER:
        v=datetime.datetime.now().replace(microsecond=0).isoformat()
      else:
        v=stateResponse.getValueByName(key)
      if v is None:
        line.append('')
      else:
        line.append(str(v.replace(",","")))
    self.currentFile.write(",".join(line))
    self.currentFile.write("\n")
    self.currentFile.flush()
  def migrateFile(self,newName):
    """
    :param newName:
    :return:
    """
    old=self.readHistoryToHash(newName)
    if old['status'] != 'OK':
      os.unlink(newName)
      self.currentFile = open(newName, 'w')
      self.__writeHeadline()
    else:
      if self.headline != old['data']['names']:
        self.logger.info("migrating history file %s", newName)
        self.currentFile = open(newName, 'w')
        self.__writeHeadline()
        for oldline in old['values']:
          dataHolder=ValueHolder(oldline)
          self.writeValuesFromState(dataHolder,False)
      else:
        self.currentFile = open(newName, 'a')

  def readHistoryForDay(self,dayOffset=0):
    fileName = self.getFileForDay(dayOffset)
    return self.readHistoryToHash(fileName)
  def readHistoryToHash(self,fileName):
    rt={'status':'ERROR'}
    if not os.path.exists(fileName):
      rt['info']="file %s not found"%fileName
      return rt
    with open(fileName,'r') as f:
      line=f.readline()
      if not line:
        rt['info']="no header in file %s"%fileName
        return rt
      header=line.rstrip().split(",")
      rt = {'status':'OK','data':{'names': header, 'values': []}}
      line=f.readline()
      while line:
        data=line.rstrip().split(',')
        out={}
        for i in range(0,len(header)):
          if i < len(data):
            out[header[i]]=data[i]
        rt['data']['values'].append(out)
        line=f.readline()
    return rt

  def getHistoryDays(self):
    rt=[]
    for i in range(-self.MAXDAYS,1):
      if os.path.exists(self.getFileForDay(i)):
        rt.append(i)
    return rt

