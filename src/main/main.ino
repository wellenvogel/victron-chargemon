#include "Callback.h"
#include "Receiver.h"
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
History* history=NULL;
long lastout=0;

byte historySizeIndex=-1;
byte historyIntervalIndex=-1;

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
  if (strcasecmp(tok, "STATUS") == 0 || strcasecmp(tok, "STATE") == 0) {
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
  if (strcasecmp(tok, "HISTORY") == 0) {
    receiver->sendSerial("##HISTORY",true);
    if (history) history->writeHistory(receiver);
    receiver->sendSerial("#END",true);
    return;
  }
  if (strcasecmp(tok, "TESTON") == 0) {
    receiver->sendSerial("##TESTON",true);
    if (Settings::getCurrentValue(SETTINGS_ON_TIME) > 0) controller->changeState(Controller::TestOn);
    printStatus();
    return;  
  }
  if (strcasecmp(tok,"TESTOFF")==0){
    receiver->sendSerial("##TESTOFF",true);
    if (controller->getState()==Controller::TestOn){
      controller->changeState(Controller::Init);
      printStatus();
    }
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
  bool rt=Settings::reset(false);
  if (rt){
    receiver->sendSerial("##INITIALIZED SETTINGS",true);
  }
  Settings::printSettings(receiver);
  historyIntervalIndex=Settings::itemIndex(SETTINGS_HISTORY_INTERVAL);
  historySizeIndex=Settings::itemIndex(SETTINGS_HISTORY_SIZE);
  int historyInterval=Settings::getCurrentValue(historyIntervalIndex);
  int historySize=Settings::getCurrentValue(historySizeIndex);
  if (historyInterval > 0 && historySize > 0){
    history=new History(historySize,historyInterval,victron,controller);
  }
  loopIdx=Settings::itemIndex(SETTINGS_STATUS_INTERVAL);
}

void loop() {
  receiver->loop();
  victron->loop();
  controller->loop();
  if (history) history->loop();
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
  int nSize=Settings::getCurrentValue(historySizeIndex);
  int nInterval=Settings::getCurrentValue(historyIntervalIndex);
  if (
    (history == NULL && nSize > 0 && nInterval > 0)
    ||
    (history && (nSize != history->getSize() || nInterval != history->getInterval()))
    ){
      receiver->sendSerial("#RESETHISTORY, size=");
      receiver->sendSeriali(nSize);
      receiver->sendSerial(", interval=");
      receiver->sendSeriali(nInterval,true);
      if (history){
        delete history;
        history=NULL;
      }
      if (nSize && nInterval){
        history=new History(nSize,nInterval,victron,controller);
      }
    }
}
