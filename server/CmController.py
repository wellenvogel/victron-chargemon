import time
QUERY_INTERVAL=5
class CmController:
  def __init__(self,serial,history=None):
    self.serial=serial
    self.history=history
    self.lastState=None
    self.lastStateQuery=None

  def setSerial(self,serial):
    self.serial=serial

  def getHttpRequestParam(cls,requestparam,name):
    rt = requestparam.get(name)
    if rt is None:
      return None
    if isinstance(rt, list):
      return rt[0]
    return rt
  def getMandatoryParam(self,param,name):
    rt=self.getHttpRequestParam(param,name)
    if rt is None:
      raise Exception("missing parameter %s"%name)
    return rt
  def handleRequest(self,path,param):
    if path=="history":
      day=self.getHttpRequestParam(param,'day')
      if day is not None:
        day=int(day)
      else:
        day=0
      if self.history is None:
        rt={'status':'ERROR','info':'no history configured'}
        return rt
      rt=self.history.readHistoryForDay(day)
      return rt
    if path=="days":
      if self.history is None:
        rt={'status':'ERROR','info':'no history configured'}
        return rt
      rt={'status':'OK','data':self.history.getHistoryDays()}
      return rt
    if self.serial is None:
      return {
        'status':'ERROR',
        'info':'no serial connection'
      }
    if path == "command":
      cmd=self.getMandatoryParam(param,'cmd')
      store=None
      if cmd == 'state':
        now=time.monotonic()
        if self.lastState is not None and self.lastStateQuery is not None:
          if now < (self.lastStateQuery + QUERY_INTERVAL):
            store=self.lastState
        if store is None:
          self.lastStateQuery=now
      if store is None:
        store=self.serial.sendCommandAndWait(cmd)
        if cmd == 'state':
          self.lastState=store
      items=store.getAll()
      rt={'status':store.result}
      if store.error is not None:
        rt['info']=store.error
      data=[]
      for k in items:
        data.append(items[k].toResponse())
      rt['data']=data
      return rt
    if path=='raw':
      cmd = self.getMandatoryParam(param, 'cmd')
      store = self.serial.sendCommandAndWait(cmd,raw=True)
      items = store.getAll()
      rt = {'status': 'OK'}
      data = []
      for k in items:
        data.append(k)
      rt['data'] = data
      return rt
    return {}
