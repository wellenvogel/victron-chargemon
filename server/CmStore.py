import time
from CmDefines import *

MAXAGE=30

class CmReceivedItem:
  def __init__(self,definition,value):
    self.definition=definition # type: Item
    self.value=value
    self.timestamp=time.time()

  def getValue(self):
    if self.definition.factor is None:
      return self.value
    try:
      v=float(self.value)
      v=v*self.definition.factor
      return str(v)
    except:
      return self.value


class CmStore:
  def __init__(self,maxage):
    self.maxage=maxage
    self.store={}

  def __stillValid(self,item,now=time.time()):
    if item is None:
      return False
    return item.timestamp >= (now-self.maxage)

  def getItem(self,definition):
    if definition is None:
      return None
    key = definition.name
    v = self.store.get(key)
    if self.__stillValid(v):
      return v
    return None

  def getItems(self,definitions):
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
    key=receivedItem.definition.name
    self.store[key]=receivedItem

