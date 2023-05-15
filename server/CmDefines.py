class Item:
  def __init__(self,name,display,unit='',factor=None,fract=None):
    self.name=name
    self.display=display
    self.unit=unit
    self.factor=factor
    self.isMulti=False
    self.fract=fract
  def isHistory(self):
    return False
  def toResponse(self):
    return {
      'name':self.name,
      'display':self.display,
      'unit':self.unit,
      'multi':self.isMulti
    }

class HistoryItem(Item):
  def __init__(self,name,display,unit='',factor=None,isFirst=False,isLast=False,isMulti=False):
    Item.__init__(self,name,display,unit,factor)
    self.isFirst=isFirst
    self.isLast=isLast
    self.isMulti=isMulti
  def isHistory(self):
    return True


class CmDefines:
  STATUS=[
    Item('Connection','Connection'),
    Item('Time','Time since Start','s'),
    Item('V','Battery Voltage','V',factor=0.001,fract=3),
    Item('VPV','Panel Voltage','V',factor=0.001,fract=3),
    Item('PPV','Panel Power','W',fract=2),
    Item('I','Charge Current','A',factor=0.001,fract=3),
    Item('CS','Charger State'),
    Item('CState','Controller State'),
    Item('CTime','Time in State','s'),
    Item('COutput','Output State'),
    Item('CEnabled','Controller enabled'),
    Item('CRemain','Remain in State','s'),
    Item('Ram', 'Available Ram')
  ]
  SETTINGS=[
    Item('Enabled','Enabled'),
    Item('FloatTime','Wait time in Float','s'),
    Item('MinTime','Minimal On Time','s'),
    Item('KeepOnVoltage','Voltage to keep on','mV'),
    Item('OffVoltage','Force Off Voltage','mV'),
    Item('MaxTime','Max On Time','s'),
    Item('StatusInterval','Send Status every','s'),
    Item('HistorySize','Size of History'),
    Item('HistoryInterval','History interval','s'),
    Item('TestOnTime','On Time for Test','s'),
    #Item('DebugTimeShift','Shift time for debug')
    ]
  HISTORY=[
    HistoryItem('TS','History Current',unit='s',isFirst=True),
    HistoryItem('HS','History Size'),
    HistoryItem('HI','History Interval','s'),
    HistoryItem('NE','History Entries'),
    HistoryItem('TE','History Value',isMulti=True),
    HistoryItem('SU','Sum On Time',unit='s',isLast=True)
  ]
  @classmethod
  def findDefinition(cls,name):
    for define in cls.SETTINGS+cls.STATUS+cls.HISTORY:
      if name == define.name:
        return define
    return None



