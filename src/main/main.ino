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
byte speedUpIndex=-1;

const char DELIMITER[] = " ";
boolean valuesValid=false;
void printStatus(int num=0){
  sendNumber(num);
  receiver->sendSerial("#STATUS",true);
  sendNumber(num);
  receiver->sendSerial("Connection=");
  receiver->sendSerial(valuesValid?"OK":"FAIL",true);
  sendNumber(num);
  receiver->sendSerial("Time=");
  receiver->sendSeriali(TimeBase::secondsSinceStart(),true);
  victron->writeStatus(receiver,num);
  controller->writeStatus(receiver,num);
  receiver->sendResult(num);
}

/**
 * a handler for long lasting outputs
 * like history to ensure that we do not run into overflow 
 * for the receiver
 */
class IntermediateHandler : public Callback{
  virtual void callback(const char * data){
    victron->loop();
  }
};

IntermediateHandler * intermediateHandler=new IntermediateHandler();

void sendNumber(int num){
  if (receiver) receiver->writeNumberPrefix(num);
}

void handleSerialLine(const char *receivedData) {
  char * tok = strtok(receivedData, DELIMITER);
  if (! tok) return;
  int num=0;
  if ('0' <= tok[0] && tok[0] <= '9'){
    //number in front of command - reply this
    num=atoi(tok);
    tok=strtok(NULL,DELIMITER);
    if (! tok) return;
  }
  if (strcasecmp(tok, "STATUS") == 0 || strcasecmp(tok, "STATE") == 0) {
    printStatus(num);
    return;
  }
  if (strcasecmp(tok, "RESET") == 0) {
    sendNumber(num);
    receiver->sendSerial("##RESET",true);
    Settings::reset(true);
    Settings::printSettings(receiver,num);
    receiver->sendResult(num);
    return;
  }
  if (strcasecmp(tok, "SET") == 0) {
    sendNumber(num);
    receiver->sendSerial("##SET",true);
    char * name = strtok(NULL, DELIMITER);
    if (!name) {
      Settings::printSettings(receiver,intermediateHandler,num);
      receiver->sendResult(num);
      return;
    }
    char * val = strtok(NULL, DELIMITER);
    bool rt=false;
    if (val) {
      rt=Settings::setCurrentValue(name,atol(val));
    }  
    if (! rt){
      receiver->sendResult(num,"SET failed");
    }
    else{
      Settings::printSettings(receiver,intermediateHandler,num);
      receiver->sendResult(num);
    }
    return;
  }
  if (strcasecmp(tok, "HISTORY") == 0) {
    sendNumber(num);
    receiver->sendSerial("##HISTORY",true);
    if (history) history->writeHistory(receiver,intermediateHandler,num);
    receiver->sendResult(num);
    return;
  }
  if (strcasecmp(tok, "TESTON") == 0) {
    sendNumber(num);
    receiver->sendSerial("##TESTON",true);
    if (Settings::getCurrentValue(SETTINGS_ON_TIME) > 0) controller->changeState(Controller::TestOn);
    printStatus(num);
    return;  
  }
  if (strcasecmp(tok,"TESTOFF")==0){
    sendNumber(num);
    receiver->sendSerial("##TESTOFF",true);
    if (controller->getState()==Controller::TestOn){
      controller->changeState(Controller::Init);
      printStatus(num);
    }
    else{
      receiver->sendResult(num);
    }
    return;
  }

  sendNumber(num); 
  receiver->sendSerial("##Unknown command: ");
  receiver->sendSerial(tok,true);
  receiver->sendResult(num,"unknown command");
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
  receiver->init(19200);
  alternateReceiver->init(19200);
  victron=new VictronReceiver(alternateReceiver);
  controller=new Controller(victron);
  receiver->sendSerial("start",true);
  bool rt=Settings::reset(false);
  if (rt){
    receiver->sendSerial("##INITIALIZED SETTINGS",true);
  }
  speedUpIndex=Settings::itemIndex(SETTINGS_SPEED_UP);
  TimeBase::setDebugSpeedUp(Settings::getCurrentValue(speedUpIndex));
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
  bool resetHistory=false;
  uint8_t speedUp=Settings::getCurrentValue(speedUpIndex);
  if ( speedUp != TimeBase::getDebugSpeedUp()){
    receiver->sendSerial("#SPEEDUP CHANGE=");
    receiver->sendSeriali(speedUp,true);
    TimeBase::setDebugSpeedUp(speedUp);
    resetHistory=true;
  }
  int nSize=Settings::getCurrentValue(historySizeIndex);
  int nInterval=Settings::getCurrentValue(historyIntervalIndex);
  if (
    (history == NULL && nSize > 0 && nInterval > 0)
    ||
    (history && (nSize != history->getSize() || nInterval != history->getInterval()))
    ||
    resetHistory
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
