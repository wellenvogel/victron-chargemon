import time
from CmDefines import *

MAXAGE=30

class CmReceivedItem:
  def __init__(self,definition,value):
    self.definition=definition # type: [Item, HistoryItem]
    self.value=value
    self.timestamp=time.time()

  def __valueFract(self,v):
    if v is None or v == '##':
      return v
    if self.definition.fract is None:
      return str(v)
    v=float(v)
    return ("%."+str(self.definition.fract)+"f")%v

  def getValue(self):
    if self.definition.factor is None:
      return self.__valueFract(self.value)
    try:
      v=float(self.value)
      v=v*self.definition.factor
      return self.__valueFract(v)
    except:
      return self.value
  def toResponse(self):
   return {
      'value': self.getValue(),
      'definition': self.definition.toResponse()
    }

class CmStore:
  def __init__(self,maxage=MAXAGE,isRaw=False):
    self.maxage=maxage
    self.isRaw=isRaw
    self.reset()
  def reset(self):
    if self.isRaw:
      self.store=[]
    else:
      self.store={}
    self.result=None
    self.error=None
  def __stillValid(self,item,now=time.time()):
    if item is None:
      return False
    return item.timestamp >= (now-self.maxage)

  def getItem(self,definition):
    if definition is None:
      return None
    if self.isRaw:
      raise Exception("invalid usage, raw store")
    key = definition.name
    v = self.store.get(key)
    if self.__stillValid(v):
      return v
    return None
  def getValueByName(self,name):
    if name is None:
      return None
    if self.isRaw:
      raise Exception("invalid usage, raw store")
    v = self.store.get(name)
    if self.__stillValid(v):
      return v.getValue()
    return None
  def getAll(self):
    if self.isRaw:
      return self.store
    return self.getItems(CmDefines.STATUS+CmDefines.SETTINGS+CmDefines.HISTORY)

  def getItems(self,definitions):
    if self.isRaw:
      raise Exception("invalid usage, raw store")
    rt={}
    now=time.time()
    for d in definitions:
      v=self.getItem(d)
      if v is not None:
        rt[d.name]=v
    return rt
  def addItem(self,receivedItem):
    """
    add an item
    :param receivedItem: the item being received
    :type receivedItem: CmReceivedItem
    :return:
    """
    if self.isRaw:
      raise Exception("invalid usage, raw store")
    key=receivedItem.definition.name
    if receivedItem.definition.isMulti:
      if self.store.get(key) is None:
        self.store[key]=receivedItem
        v=receivedItem.value
        self.store[key].value=[v]
      else:
        self.store[key].value.append(receivedItem.value)
    else:
      self.store[key]=receivedItem
  #seqeunce should already has been stripped
  def addLine(self,line):
    if line.startswith('#RESULT'):
      st=line.rstrip().split(" ",2)
      if len(st) >= 2:
        self.result=st[1]
        if len(st) > 2:
          self.error=st[2]
    if self.isRaw:
      self.store.append(line.rstrip())
      return
    if line.startswith('#'):
      return
    content=line.rstrip().split('=',2)
    if len(content) < 2:
      return
    definition=CmDefines.findDefinition(content[0])
    if definition is None:
      return
    v=CmReceivedItem(definition,content[1])
    self.addItem(v)