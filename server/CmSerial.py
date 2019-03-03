import logging
import re
import termios
import threading
import serial
import traceback

import Constants
from CmStore import *
from CmUtil import *

class CmSerial:
  MAX_COMMAND_TIME=10
  class State(Enum):
    INIT=0
    OPEN=1
    STOPPED=2
    ERROR=3
  def __init__(self,port,baud=9600):
    self.port=port
    self.store=None # type: CmStore
    self.baud=baud
    self.state=self.State.INIT # type: CmSerial.State
    self.stop=False
    self.device=None
    self.sequence=1
    self.runningSequence=None
    self.runningStarted=None
    self.condition=threading.Condition()
    self.stop=False
    self.logger = logging.getLogger(Constants.LOGNAME)
    try:
      pnum=int(self.port)
    except:
      pnum=self.port
    try:
      #dirty hack to avoid resetting the arduino
      #see https://github.com/pyserial/pyserial/issues/124
      #https://raspberrypi.stackexchange.com/questions/9695/disable-dtr-on-ttyusb0/31298#31298
      f = open(pnum)
      attrs = termios.tcgetattr(f)
      attrs[2] = attrs[2] & ~termios.HUPCL
      termios.tcsetattr(f, termios.TCSAFLUSH, attrs)
      f.close()
      self.device=serial.Serial(port=pnum,baudrate=self.baud)
    except:
      self.logger.error("Unable to open port: %s"%(traceback.format_exc()))
      self.device=None
      self.state=self.State.ERROR
      return
    self.state=self.State.OPEN
    self.thread = threading.Thread(target=self.run)
    self.thread.setName('Serial %s' % (self.port))
    self.thread.setDaemon(True)
    self.thread.start()


  def parseLine(self,data):
    sequence=None
    s=re.match("^[0-9]+ *",data)
    if s is not None:
      try:
        sequence=int(data[s.start():s.end()])
      except:
        pass
      data=data[s.end():]
    if sequence is not None and data.rstrip() == '#END':
      self.condition.acquire()
      self.runningSequence=None
      self.store=None
      self.condition.release()
      return
    if self.runningSequence != sequence:
      return
    if self.store is None:
      return
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


  def __isFree(self):
    if self.runningSequence is None:
      return True
    if self.runningStarted is None:
      self.runningSequence=None
      return True
    if self.runningStarted < (time.time() - self.MAX_COMMAND_TIME):
      self.logger.error("command  %d timed out"%(self.runningSequence))
      self.runningSequence=None
      return True
    return False

  def sendCommand(self,command,store=None,timeout=MAX_COMMAND_TIME):
    if self.device is None:
      raise Exception("device not open")
    mySequence=None
    startTime=time.time()
    try:
      self.condition.acquire()
      while time.time() < (startTime+timeout):
        if self.__isFree():
          self.sequence+=1
          mySequence=self.sequence
          self.runningSequence=mySequence
          self.runningStarted=time.time()
          self.condition.release()
          break
        else:
          self.condition.wait(timeout=1.0)
    except:
      pass
    if mySequence is None:
      self.condition.release()
      raise Exception("unable to start command - timeout reached")
    self.store=store
    self.device.write("%d %s\n"%(mySequence,command.encode('ascii', 'ignore')))
    return mySequence

  def waitForCommand(self,sequence,timeout=MAX_COMMAND_TIME):
    if sequence is None:
      return False
    start=time.time()
    self.condition.acquire()
    while time.time() < (start +timeout):
      self.__isFree() #check for timeouts
      if self.runningSequence != sequence:
        self.condition.release()
        return True
      self.condition.wait(0.1)
    self.condition.release()
    raise Exception("Timeout waiting for command %d completion"%(sequence))

  def sendCommandAndWait(self,command,timeout=MAX_COMMAND_TIME):
    store=CmStore()
    seq=self.sendCommand(command,store,timeout)
    if seq is None:
      raise Exception("unable to send command %s"%command)
    self.waitForCommand(seq,timeout)
    return store

  def close(self):
    self.stop=True

  def run(self):
      while not self.stop and self.device is not None:
        try:
          line=self.device.readline(1000)
        except:
          self.logger.error("Exception while reading serial %s"%(traceback.format_exc()))
          self.device.close()
          self.state=self.State.ERROR
          return
        if line is not None:
          data=line.decode('ascii','ignore')
          self.parseLine(data)
      self.device.close()


