class CmController:
  def __init__(self,serial):
    self.serial=serial

  def setSerial(self,serial):
    self.serial=serial

  def getHttpRequestParam(cls,requestparam,name):
    rt = requestparam.get(name)
    if rt is None:
      return None
    if isinstance(rt, list):
      return rt[0].decode('utf-8', errors='ignore')
    return rt
  def getMandatoryParam(self,param,name):
    rt=self.getHttpRequestParam(param,name)
    if rt is None:
      raise Exception("missing parameter %s"%name)
    return rt
  def handleRequest(self,path,param):
    if self.serial is None:
      return {
        'status':'ERROR',
        'info':'no serial connection'
      }
    if path == "command":
      cmd=self.getMandatoryParam(param,'cmd')
      store=self.serial.sendCommandAndWait(cmd)
      items=store.getAll()
      rt={'status':'OK'}
      data=[]
      for k in items:
        data.append(items[k].toResponse())
      rt['data']=data
      return rt
    return {}
