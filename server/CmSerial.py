import threading
import serial
import traceback

from CmStore import *
from CmUtil import *

class CmSerial:
  class State(Enum):
    INIT=0
    OPEN=1
    STOPPED=2
    ERROR=3
  def __init__(self,port,store,baud=9600):
    self.port=port
    self.store=store # type: CmStore
    self.baud=baud
    self.thread=threading.Thread(target=self.run)
    self.thread.setName('Serial %s'%(self.port))
    self.thread.setDaemon(True)
    self.thread.start()
    self.state=self.State.INIT # type: CmSerial.State
    self.stop=False
    self.device=None

  def parseLine(self,data):
    if data.startswith('#'):
      return
    content=data.rstrip().split('=',2)
    if len(content) < 2:
      return
    definition=CmDefines.findDefinition(content[0])
    if definition is None:
      return
    v=CmReceivedItem(definition,content[1])
    self.store.addItem(v)
  def isOpen(self):
    return self.state==self.State.OPEN

  def sendCommand(self,command):
    if self.device is None:
      raise Exception("device not open")
    command=command+"\n"
    self.device.write(command.encode('ascii','ignore'))

  def run(self):
    try:
      pnum=int(self.port)
    except:
      pnum=self.port
    while True:
      try:
        self.device=serial.Serial(pnum,baudrate=self.baud)
      except:
        print "Unable to open port: %s"%(traceback.format_exc())
        self.device=None
        self.state=self.State.ERROR
        time.sleep(5)
        continue
      self.state=self.State.OPEN
      while not self.stop:
        try:
          line=self.device.readline(1000)
        except:
          print "Exception while reading serial %s"%(traceback.format_exc())
          self.device.close()
          self.state=self.State.ERROR
          time.sleep(5)
          break
        if line is not None:
          data=line.decode('ascii','ignore')
          self.parseLine(data)

