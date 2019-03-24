#! /usr/bin/env python
#testprog for the charge monitor
'''
handles a sim file with the following lines
timeSeconds,inputfile,replace-expression
30;test1.log;re.sub("^CS.*","CS 3",line);...
the replace-expression is evaluated by eval, having builtins + re and the follwoing local parameters:
   * line - the input line
   * percent - percentage of the simulation time passed
   * time - time in seconds sind the sim start
examples:
#10 minutes absorption, voltage from 13.7...12.7
600;mppt2-float.log;re.sub("^CS .*","CS 4",line);re.sub("^V .*","V %d"%(13700-2000*percent/100),line)
#15 minutes float, Voltage at 13.6
900;mppt2-float.log;re.sub("^CS .*","CS 5",line);re.sub("^V .*","V 13600",line)

'''
import os
import serial
import sys
import time
import getopt
import re
class Parameters:
  def __init__(self):
    self.outfile=None
    self.speed=0.5


def err(txt):
  print "ERROR: "+txt
  exit(1)


def replace(line,replacements,timSinceStart,percent):
  for repl in replacements:
    line=eval(repl,{'re':re},{'line':line,'percent':percent,'time':time})
    x=line
  return line

def runFile(runtime,filename,replacements,parameters):
  now=time.time()
  print "#starting time=%d, file=%s"%(runtime,filename)
  while time.time() <= (now + runtime):
    try:
      ifile=open(filename,"r")
    except:
      sys.stderr.write("Exception on opening %s:%s " % (filename, str(sys.exc_info()[0])))
      return -1
    for line in ifile:
      line=line.rstrip()
      current=time.time()
      sinceStart=current-now
      op=replace(line,replacements,int(sinceStart),int(sinceStart/runtime*100))
      print op
      parameters.outfile.write(op+"\n")
      if current > (now+runtime):
        break
      time.sleep(parameters.speed)
    ifile.close()
  return 0

def runSim(fname,speedUp,parameters):
  with open(fname, "r") as simFile:
    for line in simFile:
      print "@@%s"%(line)
      xline=re.sub("#.*","",line.rstrip())
      if re.match("^ *$",xline):
        continue
      fields=xline.split(";")
      if len(fields) < 2:
        print "##invalid line %s, ignoring"%(line,)
        continue
      ti=int(fields.pop(0))
      inputFile=fields.pop(0)
      if not os.path.exists(inputFile):
        print "## file %s not found, skip"%(inputFile)
        continue
      if runFile(ti/speedUp,inputFile,fields,parameters) != 0:
        sys.stderr.write("error while running file %s, exiting"%(inputFile))
        return -1
    return 0
        
def usage(name):
  print "usage: %s [-s speedup] [-b baud] [-t interval] [-l loops] device simfile" % (name)

def mainHandler(argv):
  opts,args=getopt.getopt(argv[1:],"hs:b:t:l:",[])
  speedup=1
  baud=9600
  loops=1
  parameters = Parameters()
  for opt,arg in opts:
    if opt == '-h':
      usage(argv[0])
      return 0
    if opt == '-s':
      speedup=int(arg)
    elif opt == '-b':
      baud=int(arg)
    elif opt == '-t':
      parameters.speed=float(arg)
    elif opt == '-l':
      loops=int(arg)
  if len(args) != 2:
    usage(argv[0])
    return -1
  device=args[0]
  simName=args[1]
  if not os.path.exists(simName):
    sys.stderr.write("File %s not found"%(simName))
    return -1
  try:
    serout=serial.Serial(device,timeout=2,baudrate=baud)
  except:
    sys.stderr.write("Exception on opening %s:%s "%(device,str(sys.exc_info()[0])))
    return -1


  parameters.outfile=serout
  while loops > 0:
    rt=runSim(simName,speedup,parameters)
    if rt != 0:
      print "simulation stopping"
      return rt
    loops=loops-1






if __name__ == "__main__":
  print "starting..."
  sys.exit(mainHandler(sys.argv))
  #sendSerial(sys.argv[1],sys.argv[2],float(sys.argv[3]),int(sys.argv[4]))
