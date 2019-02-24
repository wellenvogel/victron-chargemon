import sys

from CmStore import *
from CmSerial import *

class CmMain:
  def __init__(self,serialPort,baud=9600):
    self.serialPort=serialPort
    self.baud=baud
    self.store=CmStore(MAXAGE)
    self.serial=None

  def run(self):
    self.serial=CmSerial(self.serialPort,self.store,self.baud)
    while True:
      if self.serial.isOpen():
        try:
          sq=self.serial.sendCommand('status')
          self.serial.waitForCommand(sq)
        except:
          print traceback.format_exc()
      print "Serial State=%d"%(self.serial.state)
      for st in CmDefines.STATUS:
        v=self.store.getItem(st)
        print "#%s=%s%s"%(st.display,v.getValue() if v is not None else '???',st.unit)
      time.sleep(5)


main=CmMain(sys.argv[1],int(sys.argv[2]) if len(sys.argv)>2 else 9600)
main.run()