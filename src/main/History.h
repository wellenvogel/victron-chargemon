#ifndef HISTORY_H
#define HISTORY_H
#include <Arduino.h>
#include "TimeBase.h"
#include "Controller.h"
#include "VictronReceiver.h"
/*
 * a history that stores information in a fixed time raster
 * the range is determined by the number of entries and the rastersize (in seconds)
 * the stored data (2 byte per entry):
 * 8 bits Battery voltage in mv V/100-60 : 6000mv -> 0, 7000mv -> 10, 12000mv ->60, 24000mv -> 180 usw.
 * 3 bits controller state
 * 2 Bits spare
 * 3 Bit on time in 1/7 time units
 */

int hdebug=0;

class History{
  private:
  uint16_t *history=NULL;
  static const uint16_t VOLTAGE_MASK=0xff;
  static const uint16_t VOLTAGE_SHIFT=8;
  static const uint16_t STATE_MASK=0x07;
  static const uint16_t STATE_SHIFT=5;
  static const uint16_t ONTIME_MASK=0x07;
  static const uint16_t VSTATE_MASK=0x03;
  static const uint16_t VSTATE_SHIFT=3;
  int writePointer=0;
  bool hasWrapped=false;
  int timeInterval=0;
  int historySize=0;
  unsigned long lastWriteTime=0; //this is the time we have written our last entry
  unsigned long reportedOnTime=0;
  VictronReceiver *victron;
  Controller *controller;

  uint16_t onTimeToReport(unsigned long onTimeInSeconds, unsigned long reportedOnTime){
    //we have to be carefull when multiplying seocnds
    //as we cannot "waste" any bits
    //so we need some 64 bit arithmetics
    uint64_t reported=(uint64_t)reportedOnTime * (uint64_t)timeInterval/(uint64_t)7;
    uint64_t diff=((uint64_t)onTimeInSeconds-reported)*(uint64_t)7/(uint64_t)timeInterval;
    return diff;
  }

  unsigned long reportTimeToOnTime(uint16_t reportTime){
    return ((unsigned long)reportTime*(unsigned long)timeInterval)/(unsigned long)7;
  }

  uint16_t dataToEntry(int voltage,Controller::State state,VictronReceiver::SimplifiedState victronState,uint16_t reportTime){
    uint16_t rt=0;
    voltage=voltage/100;
    if (voltage <= 60) voltage=0;
    else voltage=voltage-60;
    if (voltage > 255) voltage=255;
    if (reportTime > 7) reportTime=7;
    rt|=(uint16_t)(voltage & VOLTAGE_MASK)<<VOLTAGE_SHIFT;
    rt|=((uint16_t)state & STATE_MASK) << STATE_SHIFT;
    rt|=((uint16_t)victronState & VSTATE_MASK) << VSTATE_SHIFT;
    rt|=reportTime & ONTIME_MASK;
    return rt;
  }

  int voltageFromEntry(uint16_t entry){
    entry=(entry >> VOLTAGE_SHIFT) & VOLTAGE_MASK;
    entry+=60;
    return entry*100;
  }

  Controller::State stateFromEntry(uint16_t entry){
    entry=(entry >> STATE_SHIFT) & STATE_MASK;
    return entry;
  }

  unsigned long secondsFromEntry(uint16_t entry){
    entry=(entry & ONTIME_MASK);
    return reportTimeToOnTime(entry);
  }

  VictronReceiver::SimplifiedState vstateFromEntry(uint16_t entry){
    entry=(entry >> VSTATE_SHIFT) & VSTATE_MASK;
    return entry;
  }

   
  bool writeEntry(int voltage,Controller::State state,VictronReceiver::SimplifiedState victronState,uint16_t timeToReport){
    if(hdebug){
      Serial.print("##write entry: ");
      Serial.print(writePointer,10);
      Serial.print(",");
      Serial.print(hasWrapped,2);
      Serial.print(",");
      Serial.print(voltage,10);
      Serial.print(",");
      Serial.print(timeToReport,10);
      Serial.print(",");
    }
    history[writePointer]=dataToEntry(voltage,state,victronState,timeToReport);
    if (hdebug){
      Serial.println(history[writePointer],16);
    }
    writePointer++;
    if (writePointer >= historySize){
      writePointer=0;
      hasWrapped=true;
    }
  }

   void addHistory(unsigned long timestamp){
    //normally we should have exactly 1 entry we write
    //but if the loop gets heavily delayed, more time could have elapsed
    //in this case we potentially simply write the same values multiple times (except for the on time)
    int numEntries=lastWriteTime?(timestamp-lastWriteTime)/timeInterval:1;
    if (numEntries < 1) return; //should not happen...
    int voltage=0;
    VictronReceiver::SimplifiedState vstate=VictronReceiver::SOther;
    if (victron-> valuesValid()) {
      voltage=victron->getInfo()->voltage;
      vstate=VictronReceiver::simplifyState(victron->getInfo()->state);
    }
    Controller::State state=controller->getState();
    unsigned long currentOnTime=controller->getCumulativeOnTime();
    uint16_t reportTime=onTimeToReport(currentOnTime,reportedOnTime)/numEntries;
    for (int i=0;i<numEntries;i++){
      writeEntry(voltage,state,vstate,reportTime);
      reportedOnTime+=reportTime;
    }
  }

  
  public:
  History(int historySize,int timeInterval,VictronReceiver *victron,Controller * controller){
    this->controller=controller;
    this->victron=victron;
    this->historySize=historySize;
    this->history=new uint16_t[historySize];
    this->timeInterval=timeInterval;
    reportedOnTime=onTimeToReport(controller->getCumulativeOnTime(),0);
  }
  ~History(){
    delete [] history;
    history=NULL;
  }
  int getSize(){
    return historySize;
  }
  int getInterval(){
    return timeInterval;
  }
  void loop(){
    unsigned long now=TimeBase::timeSeconds();
    if (lastWriteTime == 0 || (now-lastWriteTime) >= timeInterval){
      addHistory(now);
      lastWriteTime=now;
    }
  }
  int numEntries(){
    if (! hasWrapped) return writePointer;
    return historySize;
  }
  int lastWrittenEntry(){
    if (! hasWrapped){
      return writePointer-1;
    }
    if (writePointer > 0) return writePointer-1;
    return historySize-1;
  }
  void writeHistory(Receiver *out, Callback *callback=NULL){
    int count=numEntries();
    if (! count) return;
    int current=lastWrittenEntry();
    if (current < 0) return;
    out->sendSerial("TS=");
    unsigned long ts=(unsigned long)count*(unsigned long)timeInterval;;
    out->sendSerial(ts,true);
    out->sendSerial("HS=");
    out->sendSerial(historySize,true);
    out->sendSerial("HI=");
    out->sendSerial(timeInterval,true);
    out->sendSerial("NE=");
    out->sendSerial(numEntries(),true);
    unsigned long diff=TimeBase::timeSeconds()-lastWriteTime;
    unsigned long sum=0;
    while (count >0){
      if ((count % 5) == 0 && callback){
        //allow to do some actions in between
        callback->callback(NULL);
      }
      uint16_t entry=history[current];
      out->sendSerial("TE=");
      out->sendSerial(diff);
      out->sendSerial(",");
      out->sendSerial(voltageFromEntry(entry));
      out->sendSerial(",");
      out->sendSerial(Controller::statusToString(stateFromEntry(entry)));
      out->sendSerial(",");
      out->sendSerial(VictronReceiver::simplifiedStateToName(vstateFromEntry(entry)));
      out->sendSerial(",");
      unsigned long seconds=secondsFromEntry(entry);
      sum+=seconds;
      out->sendSerial(seconds,true);
      diff+=timeInterval;
      current-=1;
      if (current < 0) current=historySize-1;
      count--;
    }
    if (numEntries()){
      out->sendSerial("SU=");
      out->sendSerial(sum,true);
    }
  }
  
  
};

#endif
