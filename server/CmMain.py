#! /usr/bin/env python
import datetime
import sys

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
      opts,args=getopt.getopt(argv[1:],'p:b:d')
    except getopt.GetoptError as err:
      print str(err)
      self.usage()
      raise Exception
    port=8080
    baud=19200
    self.query=0
    for o, a in opts:
      if o == '-p':
        port=int(a)
      if o == '-b':
        baud=int(a)
      if o == '-d':
        self.query=1
    self.webPort=port
    self.serialPort=args[0]
    self.baud=baud
    self.statusStore=CmStore(MAXAGE)
    self.historyStore=CmStore(MAXAGE)
    self.serial=None
    self.logger = logging.getLogger(Constants.LOGNAME)
    self.logger.setLevel(logging.INFO)
    handler = logging.handlers.TimedRotatingFileHandler(filename="cmserver.log", when="D")
    handler.setFormatter(logging.Formatter("%(asctime)s-%(message)s"))
    self.logger.addHandler(handler)
    self.logger.info("####cmserver started, port=%s,baud=%d####",self.serialPort,baud)
  def usage(self):
    print "usage: XXX [-p port] [-b baud] [-d] serialDevice"
    print "           -p - port for webserver"
    print "           -b baudrate, default 19200"
    print "           -d do queries on stdout"
    print "           serialDevice either path or usb:<usbid>"

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
      self.logger.warn("available devices: %s"%",".join(map(lambda x: "/".join(x),allDevices)))
      if doRaise:
        raise Exception("usb device %s not found "%port)
      return None
    return port
  def run(self):
    controller=CmController(None)
    server=HTTPServer(HTTPHandler,self.webPort,controller)
    serverThread=threading.Thread(target=self.runServer,args=[server])
    serverThread.setDaemon(True)
    serverThread.setName("HTTPServer")
    serverThread.start()
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
          print traceback.format_exc()
          self.serial=None
      if self.serial is None or not self.serial.isOpen():
        time.sleep(5)
        continue
      count=0
      while self.serial.isOpen():
        count += 1
        if self.query != 0:
          self.statusStore.reset()
          sq = self.serial.sendCommand('status', store=self.statusStore)
          self.serial.waitForCommand(sq)
          print "%s: Serial State=%d"%(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S"),self.serial.state)
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
              self.serial.close()
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
      time.sleep(5)

  def runServer(self,server):
    server.serve_forever()


main=CmMain(sys.argv)
main.run()