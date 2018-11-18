#include "Callback.h"
#include "SerialReceiver.h"
#include "AlternateReceiver.h"
#include "VictronReceiver.h"

SerialReceiver *receiver=NULL;
AlternateReceiver *alternateReceiver=NULL;
VictronReceiver *victron=NULL;
long lastout=0;

const char DELIMTER[] = " ";
void handleSerialLine(const char *receivedData) {
  char * tok = strtok(receivedData, DELIMTER);
  if (! tok) return;
  /*
  if (strcasecmp(tok, "STATUS") == 0) {
    printStatus();
    return;
  }
  if (strcasecmp(tok, "INTERVAL") == 0) {
    char * val = strtok(NULL, DELIMTER);
    if (! val) return;
    interval = atol(val);
    EEPROM.put(EEPROM_INTERVAL_ADDR, interval);
    Serial.print("#Interval set to: ");
    Serial.println(interval, 10);
    return;
  }
  if (strcasecmp(tok, "RESET") == 0) {
    Serial.println("##RESET");
    initData(true);
    printStatus();
    return;
  }
  */
  if (strcasecmp(tok, "TEST") == 0) {
    Serial.println("##TEST ");
    alternateReceiver->sendSerial(strtok(NULL,DELIMTER),true);
    return;
  }
  /*
  if (strcasecmp(tok, "REL") == 0) {
    int oo=atoi(strtok(NULL,DELIMTER));
    Serial.print("##REL ");
    Serial.println(oo?"ON":"OFF");
    digitalWrite(4,oo?LOW:HIGH);
    return;
  }
  */
  Serial.print("##Unknown command: ");
  Serial.println(receivedData);
}

class CbHandler : public Callback{
  virtual void callback(const char * data){
    handleSerialLine(data);
  }
};

class AlternateCbHandler: public Callback{
  virtual void callback(const char * data){
    Serial.print("##SOFT ");
    Serial.println(data);
  }
};

void setup() {
  receiver=new SerialReceiver(new CbHandler());
  alternateReceiver=new AlternateReceiver(NULL,2,3);
  receiver->init(9600);
  alternateReceiver->init(19200);
  victron=new VictronReceiver(alternateReceiver);
  receiver->sendSerial("start",true);
}

void loop() {
  receiver->loop();
  victron->loop();
  if (alternateReceiver->didOverflow()){
    Serial.println("@@OVF");
  }
  long current=millis();
  if ((current - lastout) >= 2000){
    lastout=current;
    victron->writeStatus(receiver);
  }
}
