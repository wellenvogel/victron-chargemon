#include "Callback.h"
#include "SerialReceiver.h"
#include "AlternateReceiver.h"
#include "VictronReceiver.h"
#include "Settings.h"
#include "Controller.h"
#include "History.h"
#include "TimeBase.h"

SerialReceiver *receiver=NULL;
AlternateReceiver *alternateReceiver=NULL;
VictronReceiver *victron=NULL;
Controller *controller=NULL;
long lastout=0;

const char DELIMTER[] = " ";
boolean valuesValid=false;
void printStatus(){
  receiver->sendSerial("#STATUS",true);
  receiver->sendSerial("Connection=");
  receiver->sendSerial(valuesValid?"OK":"FAIL",true);
  victron->writeStatus(receiver);
  controller->writeStatus(receiver);
  receiver->sendSerial("#END",true);
}
void handleSerialLine(const char *receivedData) {
  char * tok = strtok(receivedData, DELIMTER);
  if (! tok) return;
  if (strcasecmp(tok, "STATUS") == 0) {
    printStatus();
    return;
  }
  if (strcasecmp(tok, "RESET") == 0) {
    receiver->sendSerial("##RESET",true);
    Settings::reset(true);
    Settings::printSettings(receiver);
    return;
  }
  if (strcasecmp(tok, "SET") == 0) {
    receiver->sendSerial("##SET",true);
    char * name = strtok(NULL, DELIMTER);
    if (!name) {
      Settings::printSettings(receiver);
      return;
    }
    char * val = strtok(NULL, DELIMTER);
    if (! val) return;
    bool rt=Settings::setCurrentValue(name,atol(val));
    if (! rt){
      receiver->sendSerial("##SET failed",true);
    }
    else{
      receiver->sendSerial("##OK",true);
      Settings::printSettings(receiver);
    }
    return;
  }
  if (strcasecmp(tok, "HIST") == 0) {
    History::writeHistory(receiver);
    return;
  }
  if (strcasecmp(tok, "THIST") == 0) {
    long s=TimeBase::timeSeconds();
    /*
    unsigned long e=History::getEntry(s,1);
    Serial.println(History::TIMEMASK,16);
    Serial.println(History::CAUSEMASK,16);
    Serial.println(s,10);
    Serial.println(e,16);
    */
    History::addEntry(s,1);
    return;
  }
 
  receiver->sendSerial("##Unknown command: ");
  receiver->sendSerial(receivedData,true);
}

class CbHandler : public Callback{
  virtual void callback(const char * data){
    handleSerialLine(data);
  }
};

byte loopIdx=-1;
void setup() {
  receiver=new SerialReceiver(new CbHandler());
  alternateReceiver=new AlternateReceiver(NULL,2,3);
  receiver->init(9600);
  alternateReceiver->init(19200);
  victron=new VictronReceiver(alternateReceiver);
  controller=new Controller(victron);
  receiver->sendSerial("start",true);
  Settings::reset(false);
  Settings::printSettings(receiver);
  loopIdx=Settings::itemIndex(SETTINGS_STATUS_INTERVAL);
}

void loop() {
  receiver->loop();
  victron->loop();
  controller->loop();
  if (alternateReceiver->didOverflow()){
    Serial.println("@@OVF");
  }
  unsigned long current=millis();
  if (loopIdx>=0 && Settings::getCurrentValue(loopIdx) && (current - lastout) >= (Settings::getCurrentValue(loopIdx)*1000)){
    lastout=current;
    printStatus();
  }
  bool ns=victron->valuesValid();
  if (ns != valuesValid){
    valuesValid=ns;
    receiver->sendSerial("#STATUSCHANGE RECEIVER",true);
    printStatus();
  }
}
