#ifndef VICTRON_RECEIVER_H
#define VICTRON_RECEIVER_H
#include <Arduino.h>
#include "Receiver.h"
#include "Callback.h"

static int debug=0;
static char* stateNames[]={
  "Off",
  "LowPower",
  "Fault",
  "Bulk",
  "Absorption",
  "Float"
};
class VictronReceiver : public Callback{
  public:
  const int MAX_AGE=30000;
  typedef enum{
    Off=0,
    LowPower=1,
    Fault=2,
    Bulk=3,
    Absorption=4,
    Float=5
  }ChargerState;
  typedef struct{
    long lastState=0;
    ChargerState state=Off;
    long lastVoltage=0;
    float voltage=0;
    long lastPvoltage=0;
    float pVoltage=0;
    long lastPpower=0;
    float pPower=0;
    long lastBcurrent=0;
    float bCurrent=0;
  }VictronInfo;
  private:
  Receiver *receiver;
  VictronInfo info;

  static bool isValidState(ChargerState state){
    if (state < 0 || state >= (sizeof(stateNames)/sizeof(char*))) return false;
    return true;
  }
  static const char *stateToName(ChargerState state){
   if (! isValidState(state)) return "UNKNOWN";
    return stateNames[state];
  }
  public:
  VictronReceiver(Receiver *r){
    receiver=r;
    receiver->setCallback(this);
  }

  virtual void callback(const char *buffer){
    long current=millis();
    const char *delim="\t ";
    char *label=strtok(buffer,delim);
    char *value=strtok(NULL,delim);
    if (debug){
      Serial.print("@@");
      Serial.print(label);
      Serial.print("=");
      Serial.println(value);
    }
    if (! label || ! value) return;
    if (strcmp("V",label) == 0){
      //battery voltage
      float nv=atoi(value)/1000.0f;
      if (nv < 0 || nv > 100) return;
      info.lastVoltage=current;
      info.voltage=nv;
      if (debug){
        Serial.print("@V=");
        Serial.println(nv);
      }
    }
    if (strcmp("VPV",label) == 0){
      //panel voltage
      float nv=atoi(value)/1000.0f;
      if (nv < 0 || nv > 100) return;
      info.lastPpower=current;
      info.pPower=nv;
      if (debug){
        Serial.print("@PPV=");
        Serial.println(nv);
      }
    }
    if (strcmp("PPV",label) == 0){
      //panel power
      float nv=atoi(value)*1.0f;
      if (nv < 0 || nv > 1000) return;
      info.lastPvoltage=current;
      info.pVoltage=nv;
      if (debug){
        Serial.print("@VPV=");
        Serial.println(nv);
      }
    }
    if (strcmp("I",label) == 0){
      //Battery current
      float nv=atoi(value)/1000.0f;
      if (nv < 0 || nv > 1000) return;
      info.lastBcurrent=current;
      info.bCurrent=nv;
      if (debug){
        Serial.print("@I=");
        Serial.println(nv);
      }
    }
    if (strcmp("CS",label) == 0){
      //state
      ChargerState state=atoi(value);
      if (! isValidState(state)) return;
      info.lastState=current;
      info.state=state;
      if (debug){
        Serial.print("@State=");
        Serial.println(stateToName(state));
      }
    }
  }

  void loop(){
    receiver->loop();
  }
  const VictronInfo *getInfo(){
    return &info;
  }
  void writeStatus(Receiver *out){
    long current=millis();
    out->sendSerial("#STATUS",true);
    if ((info.lastVoltage+MAX_AGE) >= current){
      out->sendSerial("V=");
      char buf[10];
      out->sendSerial(dtostrf(info.voltage,2,3,buf),true); 
    }
    else{
      out->sendSerial("V=##",true);
    }
    if ((info.lastPvoltage+MAX_AGE) >= current){
      out->sendSerial("VPV=");
      char buf[10];
      out->sendSerial(dtostrf(info.pVoltage,2,3,buf),true); 
    }
    else{
      out->sendSerial("VPV=##",true);
    }
    if ((info.lastPpower+MAX_AGE) >= current){
      out->sendSerial("PPV=");
      char buf[10];
      out->sendSerial(dtostrf(info.pPower,3,3,buf),true); 
    }
    else{
      out->sendSerial("PPV=##",true);
    }
    if ((info.lastBcurrent+MAX_AGE) >= current){
      out->sendSerial("I=");
      char buf[10];
      out->sendSerial(dtostrf(info.bCurrent,3,3,buf),true); 
    }
    else{
      out->sendSerial("I=##",true);
    }
    if ((info.lastState+MAX_AGE) >= current){
      out->sendSerial("CS=");
      out->sendSerial(stateToName(info.state),true); 
    }
    else{
      out->sendSerial("CS=##",true);
    }
    out->sendSerial("#END",true);
  }
};
#endif
