#ifndef VICTRON_RECEIVER_H
#define VICTRON_RECEIVER_H
#include <Arduino.h>
#include "Receiver.h"
#include "Callback.h"
#include "TimeBase.h"
#include "Settings.h"

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
  static const int MAX_AGE=30;
  typedef enum{
    Off=0,
    LowPower=1,
    Fault=2,
    Bulk=3,
    Absorption=4,
    Float=5
  }ChargerState;

  //a state that fits into 2 bit for the history
  typedef enum{
    SError=0,
    SOther=1,
    SAbsorption=2,
    SFloat=3
  }SimplifiedState;
  typedef struct{
    unsigned long lastState=0;
    ChargerState state=Off;
    unsigned long lastVoltage=0;
    long voltage=0;
    unsigned long lastPvoltage=0;
    long pVoltage=0;
    unsigned long lastPpower=0;
    long pPower=0;
    unsigned long lastBcurrent=0;
    long bCurrent=0;
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

  static const char *simplifiedStateToName(SimplifiedState state){
    if (state == SOther){
      return "Other";
    }
    if (state == SError){
      return "Error";
    }
    return stateToName(state+2);
  }

  static SimplifiedState simplifyState(ChargerState state){
    if (state > 3 && state <= Float) return state-2;
    if (state == Fault) return SError;
    return SOther;
  }
  static boolean isValidValue(unsigned long valueTime,unsigned long currentTime){
    return (valueTime+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= currentTime;
  }

  boolean valuesValid(){
    long current=TimeBase::timeSeconds();
    if (! isValidValue(info.lastState,current)) return false;
    if (! isValidValue(info.lastVoltage,current)) return false;
    if (! isValidValue(info.lastPvoltage,current)) return false;
    if (! isValidValue(info.lastPpower,current)) return false;
    if (! isValidValue(info.lastBcurrent,current)) return false;
    return true;
  }

  virtual void callback(const char *buffer){
    long current=TimeBase::timeSeconds();
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
      long nv=atol(value);
      if (nv < 0 || nv > 100000) return;
      info.lastVoltage=current;
      info.voltage=nv;
      if (debug){
        Serial.print("@V=");
        Serial.println(nv);
      }
    }
    if (strcmp("PPV",label) == 0){
      //panel power
      long nv=atol(value);
      if (nv < 0 || nv > 1000) return;
      info.lastPpower=current;
      info.pPower=nv;
      if (debug){
        Serial.print("@PPV=");
        Serial.println(nv);
      }
    }
    if (strcmp("VPV",label) == 0){
      //panel voltage
      long nv=atol(value);
      if (nv < 0 || nv > 150000) return;
      info.lastPvoltage=current;
      info.pVoltage=nv;
      if (debug){
        Serial.print("@VPV=");
        Serial.println(nv);
      }
    }
    if (strcmp("I",label) == 0){
      //Battery current
      long nv=atol(value);
      if (nv < -100000 || nv > 100000) return;
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
  void writeStatus(Receiver *out,int num=0){
    long current=TimeBase::timeSeconds();
    int demo=Settings::getCurrentValue(SETTINGS_DEMO);
    out->writeNumberPrefix(num);
    if (((info.lastVoltage+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= current) || demo){
      out->sendSerial("V=");
      out->sendSerial(demo?random(12000):info.voltage,true); 
    }
    else{
      out->sendSerial("V=##",true);
    }
    out->writeNumberPrefix(num);
    if (((info.lastPvoltage+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= current) || demo){
      out->sendSerial("VPV=");
      out->sendSerial(demo?random(36000):info.pVoltage,true); 
    }
    else{
      out->sendSerial("VPV=##",true);
    }
    out->writeNumberPrefix(num);
    if (((info.lastPpower+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= current)|| demo){
      out->sendSerial("PPV=");
      out->sendSerial(demo?random(90):info.pPower,true); 
    }
    else{
      out->sendSerial("PPV=##",true);
    }
    out->writeNumberPrefix(num);
    if (((info.lastBcurrent+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= current)||demo){
      out->sendSerial("I=");
      out->sendSerial(demo?random(20000):info.bCurrent,true); 
    }
    else{
      out->sendSerial("I=##",true);
    }
    out->writeNumberPrefix(num);
    if (((info.lastState+(MAX_AGE<<TimeBase::getDebugSpeedUp())) >= current)||demo){
      out->sendSerial("CS=");
      out->sendSerial(demo?"Demo":stateToName(info.state),true); 
    }
    else{
      out->sendSerial("CS=##",true);
    }
  }
};
#endif
