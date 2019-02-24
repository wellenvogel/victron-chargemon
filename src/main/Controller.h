#ifndef CONTROLLER_H
#define CONTROLLER_H
#include <Arduino.h>
#include "TimeBase.h"
#include "VictronReceiver.h"
#include "Settings.h"
#include "Receiver.h"
//the controller for the output
class Controller{
  public:
  const int PORT=4;
  const int LED_PORT=5;
  const int PORT_ON=LOW;
  const int PORT_OFF=HIGH;
  const int LED_PORT_ON=HIGH;
  const int LED_PORT_OFF=LOW;
  const unsigned long BLINKTIME=800; //ms
  typedef enum{
    Init=0,
    WaitFloat,  //wait for the charger to enter float state, output off
    FloatTime,  //wait for the minimal float time (FloatTime), output off
    OnMinTime,  //output on, wait for MinTime to pass
    OnExtended, //still on after min time if the voltage exceeds KeepOnVoltage
    TestOn      //switch on for SETTINGS_TEST_TIME
  } State;

  typedef enum {
    Off=0,
    Blink=1,
    On=2
  } LedState;

  Controller(VictronReceiver *receiver){
    this->receiver=receiver;
    pinMode(PORT,OUTPUT);
    digitalWrite(PORT,PORT_OFF);
    pinMode(LED_PORT,OUTPUT);
    digitalWrite(LED_PORT,LED_PORT_OFF);
    settingsFloatTime=Settings::itemIndex(SETTINGS_FLOAT_TIME);
    settingsMinTime=Settings::itemIndex(SETTINGS_MIN_TIME);
    settingsMaxTime=Settings::itemIndex(SETTINGS_MAX_TIME);
    settingsOnVoltage=Settings::itemIndex(SETTINGS_KEEP_VOLTAGE);
    settingsOffVoltage=Settings::itemIndex(SETTINGS_OFF_VOLTAGE);
    settingsOnTime=Settings::itemIndex(SETTINGS_ON_TIME);
    settingsEnabled=Settings::itemIndex(SETTINGS_ENABLED);
  }

  private:
  State state=Init;
  long lastChange=0; //time of last state change
  VictronReceiver *receiver;
  //setting indices
  byte settingsFloatTime=-1;
  byte settingsMinTime=-1;
  byte settingsMaxTime=-1;
  byte settingsOnVoltage=-1;
  byte settingsOffVoltage=-1;
  byte settingsOnTime=-1;
  byte settingsEnabled=-1;
  unsigned long cumulativeOnTime=0;
  unsigned long ledChange=0;
  bool statusToOutput(State state){
    if (state == OnMinTime) return true;
    if (state == OnExtended) return true;
    if (state == TestOn) return true;
    return false;
  }

  LedState getLedState(){
    if (statusToOutput(state)) return On;
    if (! receiver->valuesValid()) return Off;
    return Blink;
  }

  void setOutput(){
    bool onOff=statusToOutput(state);
    digitalWrite(PORT,onOff?PORT_ON:PORT_OFF);
  }

  void setLed(){
    switch (getLedState()){
      case On:
        digitalWrite(LED_PORT,LED_PORT_ON);
        return;
      case Off:
        digitalWrite(LED_PORT,LED_PORT_OFF);
        return;  
      case Blink:
        unsigned long now=millis();
        if (now > (ledChange+BLINKTIME) || now < ledChange){
          bool current=digitalRead(LED_PORT) == LED_PORT_ON;
          digitalWrite(LED_PORT,current?LED_PORT_OFF:LED_PORT_ON);
          ledChange=now;
        }
          
    }
  }


  bool checkElapsed(long intervalSeconds){
    long current=TimeBase::timeSeconds();
    if ( (current-lastChange) >= intervalSeconds){
      return true;
    }
    return false;
  }

  bool checkElapsedSetting(byte index){
    int iv=Settings::getCurrentValue(index);
    if (iv && checkElapsed(iv)) return true;
    return false;
  }


  public:
  static const char * statusToString(State state){
    switch(state){
      case Init: return "Init";
      case WaitFloat:  return "WaitFloat";
      case OnMinTime:  return "OnMinTime";
      case OnExtended: return "OnExtended";
      case TestOn:     return "TestOn";
    }
    return "Unknown";
  }
  bool changeState(State newState, const char *info=NULL){
    if (state != newState){
      unsigned long now=TimeBase::timeSeconds();
      if (statusToOutput(state)){
        cumulativeOnTime+=now-lastChange;
      }
      state=newState;
      lastChange=now;
      //TODO: notify
    }
    setOutput();
  }
  void loop(){
    doLoop();
    setLed();
  }
  void doLoop(){
    if (Settings::getCurrentValue(settingsEnabled) == 0){
      changeState(Init);
      return;
    }
    if (state == TestOn){
      if (checkElapsedSetting(settingsOnTime)){
        changeState(Init);
      }
      return;
    }
    bool receiverOk=receiver->valuesValid();
    if (! receiverOk){
      changeState(Init,"Disconnected");
      return;
    }
    VictronReceiver::VictronInfo *info=receiver->getInfo();
    int offVoltage=Settings::getCurrentValue(settingsOffVoltage);
    if (offVoltage && info->voltage < offVoltage){
      changeState(Init,"OffVoltage");
      return;
    }
    int iv;
    switch(state){
      case Init:
        if (info->state == VictronReceiver::Float) changeState(WaitFloat);
        return;
      case WaitFloat:
        if (info->state != VictronReceiver::Float) {
          changeState(Init);
          return;
        }
        if (checkElapsedSetting(settingsFloatTime)){
          changeState(OnMinTime);
          return;
        }
        return;
      case OnMinTime:
        if (checkElapsedSetting(settingsMaxTime)){
          changeState(Init,"MaxTime");
          return;
        }
        if (checkElapsedSetting(settingsMinTime)){
          changeState(OnExtended,"MinTime");
          return;
        }
        return;
      case OnExtended:
        iv=Settings::getCurrentValue(settingsOnVoltage);
        if (! iv || iv > info->voltage){
          changeState(Init,"OnVoltage");
          return;
        }
        if (checkElapsedSetting(settingsMaxTime)){
          changeState(Init,"MaxTime");
          return;
        }
        return;
     }
  }  
  void writeStatus(Receiver *out, int num=0){
    out->writeNumberPrefix(num);
    out->sendSerial("CState=");
    out->sendSerial(statusToString(state),true);
    out->writeNumberPrefix(num);
    out->sendSerial("CTime=");
    char buf[10];
    snprintf(buf,10,"%d",(TimeBase::timeSeconds()-lastChange));
    out->sendSerial(buf,true);
    out->writeNumberPrefix(num);
    out->sendSerial("COutput=");
    out->sendSerial(statusToOutput(state)?"On":"Off",true);
  }

  unsigned long getCumulativeOnTime(){
    if (statusToOutput(state)){
      return cumulativeOnTime + TimeBase::timeSeconds()-lastChange;
    }
    else {
      return cumulativeOnTime;
    }
  }

  const State getState(){
    return state;
  }
};
#endif
