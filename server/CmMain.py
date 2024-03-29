#! /usr/bin/env python3
import datetime
import sys

from CHistory import CHistory
from CmSerial import *
hasUsb=False
try:
  import pyudev
  hasUsb=True
except:
  pass
import Constants
from httpserver import *
from CmController import *
import logging
import logging.handlers
import getopt


class CmMain:
  def __init__(self,argv):
    try:
      opts,args=getopt.getopt(argv[1:],'p:b:d:l:g:h:')
    except getopt.GetoptError as err:
      print(str(err))
      self.usage()
      raise Exception
    port=8080
    baud=19200
    logdir="."
    guibase="gui"
    self.historyInterval=0
    self.logInterval=0
    for o, a in opts:
      if o == '-p':
        port=int(a)
      if o == '-b':
        baud=int(a)
      if o == '-d':
        self.historyInterval=int(a)
      if o == '-l':
        logdir=os.path.expanduser(a)
        if not os.path.exists(logdir):
          print("trying to create logdir %s"%(logdir))
          os.makedirs(logdir)
      if o == '-h':
        self.historyInterval=int(a)
      if o == '-g':
        guibase=os.path.expanduser(a)
        if not os.path.isabs(guibase):
          guibase=os.path.join(os.path.dirname(__file__),guibase)
        if not os.path.exists(guibase):
          raise Exception("gui base %s not found"%guibase)

    self.guibase=guibase
    self.webPort=port
    self.serialPort=args[0]
    self.baud=baud
    self.statusStore=CmStore(MAXAGE)
    self.historyStore=CmStore(MAXAGE)
    self.serial=None
    self.logger = logging.getLogger(Constants.LOGNAME)
    self.logger.setLevel(logging.INFO)
    handler = logging.handlers.TimedRotatingFileHandler(filename=os.path.join(logdir,"cmserver.log"), when="D")
    handler.setFormatter(logging.Formatter("%(asctime)s-%(message)s"))
    self.logger.addHandler(handler)
    self.logger.info("####cmserver started, port=%s,baud=%d####",self.serialPort,baud)
    self.logger.info("basedir=%s",self.guibase)
    if self.historyInterval > 0:
      self.localHistory=CHistory(logdir,self.historyInterval,list(map(lambda v: v.name, CmDefines.STATUS)))
    else:
      self.localHistory=None  
  def usage(self):
    print("usage: XXX [-p port] [-b baud] [-d] [-l logdir] [-g basedir] [-h historyInterval] serialDevice")
    print("           -p - port for webserver")
    print("           -b baudrate, default 19200")
    print("           -d do queries to log")
    print("           -h history in seconds")
    print("           -l basedir for logging, e.g. ~/.chargemon")
    print("           -g guibase the basedir for the static files to be served")
    print("           serialDevice either path or usb:<usbid>")

  def usbIdFromPath(self,path):
    rt=re.sub('/ttyUSB.*','',path).split('/')[-1]
    return rt
  def translatePort(self,port,doRaise=True):
    if port.startswith("usb:"):
      port=port[4:]
      if not hasUsb:
        raise Exception("no usb support found")
      context=pyudev.Context()
      allDevices=[]
      for dev in context.list_devices(subsystem='tty'):
        if dev.parent is None or not (dev.parent.subsystem == "usb-serial" or dev.parent.subsystem == "usb"):
          continue
        usbid = self.usbIdFromPath(dev.device_path)
        if usbid == port:
          port=dev.device_node
          self.logger.info("found usb device %s at port %s" % (usbid,port))
          return port
        allDevices.append((usbid,dev.device_node))
      self.logger.warn("usb device %s not found"%port)
      self.logger.warn("available devices: %s"%",".join(list(map(lambda x: "/".join(x),allDevices))))
      if doRaise:
        raise Exception("usb device %s not found "%port)
      return None
    return port
  def run(self):
    controller=CmController(None,self.localHistory)
    server=HTTPServer(HTTPHandler,self.webPort,controller,self.guibase)
    serverThread=threading.Thread(target=self.runServer,args=[server])
    serverThread.setDaemon(True)
    serverThread.setName("HTTPServer")
    serverThread.start()
    lastHistory=0
    lastLog=0
    count=-1
    while True:
      self.serial = None
      controller.setSerial(None)
      port = self.translatePort(self.serialPort,False)
      if port is not None:
        self.logger.info("opening serial device at %s",port)
        self.serial = CmSerial(port, self.baud)
      if self.serial is not None and self.serial.isOpen():
        try:
          time.sleep(3)
          controller.setSerial(self.serial)
        except:
          self.logger.error(traceback.format_exc())
          self.serial=None
      if self.serial is None or not self.serial.isOpen():
        time.sleep(5)
        continue
      count=0
      while self.serial.isOpen():
        count += 1
        shouldWriteHistory=self.localHistory is not None and (time.time() >= (lastHistory+self.historyInterval))
        shouldDoLog=self.logInterval != 0 and (time.time() >= (lastLog + self.logInterval))
        if shouldDoLog or shouldWriteHistory:
          self.statusStore.reset()
          try:
            if shouldWriteHistory:
              lastHistory = time.time()
            if shouldDoLog:
              lastLog=time.time()
            sq = self.serial.sendCommand('status', store=self.statusStore)
            self.serial.waitForCommand(sq)
            if shouldDoLog:
              self.logger.info("Serial State=%d"%(self.serial.state))
              for st in CmDefines.STATUS:
                v=self.statusStore.getItem(st)
                self.logger.info("#%s=%s%s"%(st.display,v.getValue() if v is not None else '???',st.unit))
            if shouldWriteHistory:
              self.localHistory.writeValuesFromState(self.statusStore)
          except:
            self.logger.error("error in status query %s"%(traceback.format_exc()))
            self.serial.close()
            lastHistory = time.time()
            continue
        time.sleep(10)
      time.sleep(5)

  def runServer(self,server):
    server.serve_forever()


main=CmMain(sys.argv)
main.run()