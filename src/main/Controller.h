#ifndef CONTROLLER_H
#define CONTROLLR_H
#include <Arduino.h>
#include "TimeBase.h"
#include "VictronReceiver.h"
#include "Settings.h"
#include "Receiver.h"
//the controller for the output
class Controller{
  public:
  const int PORT=4;
  const int PORT_ON=LOW;
  const int PORT_OFF=HIGH;
  typedef enum{
    Init=0,
    WaitFloat,  //wait for the charger to enter float state, output off
    FloatTime,  //wait for the minimal float time (FloatTime), output off
    OnMinTime,  //output on, wait for MinTime to pass
    OnExtended, //still on after min time if the voltage exceeds KeepOnVoltage
  } State;

  Controller(VictronReceiver *receiver){
    this->receiver=receiver;
    pinMode(PORT,OUTPUT);
    digitalWrite(PORT,PORT_OFF);
    settingsFloatTime=Settings::itemIndex("FloatTime");
    settingsMinTime=Settings::itemIndex("MinTime");
    settingsMaxTime=Settings::itemIndex("MaxTime");
    settingsOnVoltage=Settings::itemIndex("KeepOnVoltage");
    settingsOffVoltage=Settings::itemIndex("OffVoltage");
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
  bool statusToOutput(State state){
    if (state == OnMinTime) return true;
    if (state == OnExtended) return true;
    return false;
  }

  void setOutput(){
    bool onOff=statusToOutput(state);
    digitalWrite(PORT,onOff?PORT_ON:PORT_OFF);
  }

  bool changeState(State newState, const char *info=NULL){
    if (state != newState){
      state=newState;
      lastChange=TimeBase::timeSeconds();
      //TODO: notify
    }
    setOutput();
  }

  bool checkElapsed(long intervalMinutes){
    long current=TimeBase::timeSeconds();
    if ( (current-lastChange) >= (intervalMinutes*60)){
      return true;
    }
    return false;
  }

  bool checkElapsedSetting(byte index){
    int iv=Settings::getCurrentValue(index);
    if (iv && checkElapsed(iv)) return true;
    return false;
  }
  static const char * statusToString(State state){
    switch(state){
      case Init: return "Init";
      case WaitFloat: return "WaitFloat";
      case OnMinTime: return "OnMinTime";
      case OnExtended: return "OnExtended";
    }
    return "Unknown";
  }


  public:
  void loop(){
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
        if (checkElapsedSetting(settingsMinTime)){
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
  void writeStatus(Receiver *out){
    out->sendSerial("State=");
    out->sendSerial(statusToString(state),true);
    out->sendSerial("Time=");
    char buf[10];
    snprintf(buf,10,"%d",(TimeBase::timeSeconds()-lastChange));
    out->sendSerial(buf,true);
    out->sendSerial("Output=");
    out->sendSerial(statusToOutput(state)?"On":"Off",true);
  }
};
#endif
