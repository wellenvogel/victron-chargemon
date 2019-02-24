import sys

from CmStore import *
from CmSerial import *

class CmMain:
  def __init__(self,serialPort,baud=9600):
    self.serialPort=serialPort
    self.baud=baud
    self.statusStore=CmStore(MAXAGE)
    self.historyStore=CmStore(MAXAGE)
    self.serial=None

  def run(self):
    self.serial=CmSerial(self.serialPort,self.baud)
    count=-1
    while True:
      count+=1
      if self.serial.isOpen():
        try:
          self.statusStore.reset()
          sq=self.serial.sendCommand('status',store=self.statusStore)
          self.serial.waitForCommand(sq)
        except:
          print traceback.format_exc()
      print "Serial State=%d"%(self.serial.state)
      for st in CmDefines.STATUS:
        v=self.statusStore.getItem(st)
        print "#%s=%s%s"%(st.display,v.getValue() if v is not None else '???',st.unit)
      if (count % 20) == 0 and self.serial.isOpen():
        try:
          self.historyStore.reset()
          sq=self.serial.sendCommand('history',store=self.historyStore)
          self.serial.waitForCommand(sq)
        except:
          print traceback.format_exc()
        print "#### HISTORY ###"
        for h in CmDefines.HISTORY:
          v=self.historyStore.getItem(h)
          if v is not None:
            val=v.getValue()
            if h.isMulti:
              for item in val:
                print "#%s=%s%s" % (h.display, item,h.unit)
            else:
              print "#%s=%s%s" % (h.display, val,h.unit)

      time.sleep(5)


main=CmMain(sys.argv[1],int(sys.argv[2]) if len(sys.argv)>2 else 9600)
main.run()