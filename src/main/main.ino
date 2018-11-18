#include "Callback.h"
#include "SerialReceiver.h"
#include "AlternateReceiver.h"
#include "VictronReceiver.h"
#include "Settings.h"

SerialReceiver *receiver=NULL;
AlternateReceiver *alternateReceiver=NULL;
VictronReceiver *victron=NULL;
long lastout=0;

const char DELIMTER[] = " ";
void handleSerialLine(const char *receivedData) {
  char * tok = strtok(receivedData, DELIMTER);
  if (! tok) return;
  if (strcasecmp(tok, "STATUS") == 0) {
    victron->writeStatus(receiver);
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
 
  receiver->sendSerial("##Unknown command: ");
  receiver->sendSerial(receivedData,true);
}

class CbHandler : public Callback{
  virtual void callback(const char * data){
    handleSerialLine(data);
  }
};

int loopIdx=-1;
void setup() {
  receiver=new SerialReceiver(new CbHandler());
  alternateReceiver=new AlternateReceiver(NULL,2,3);
  receiver->init(9600);
  alternateReceiver->init(19200);
  victron=new VictronReceiver(alternateReceiver);
  receiver->sendSerial("start",true);
  Settings::reset(false);
  Settings::printSettings(receiver);
  loopIdx=Settings::itemIndex("StatusTime");
}

void loop() {
  receiver->loop();
  victron->loop();
  if (alternateReceiver->didOverflow()){
    Serial.println("@@OVF");
  }
  long current=millis();
  if (loopIdx>=0 && Settings::getCurrentValue(loopIdx) && (current - lastout) >= (Settings::getCurrentValue(loopIdx)*1000)){
    lastout=current;
    victron->writeStatus(receiver);
  }
}
