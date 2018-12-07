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
//the time interval(s) - 8 minutes -> 360 entries / 24h
//480
#define TIME_INTERVAL 5 
//number of entries in the history list
// 360
#define HIST_MAX 10

int hdebug=1;

class History{
  private:
  uint16_t history[HIST_MAX];
  static const uint16_t VOLTAGE_MASK=0xff00;
  static const uint16_t  VOLTAGE_SHIFT=8;
  static const uint16_t STATE_MASK=0xe0;
  static const uint16_t  STATE_SHIFT=5;
  static const uint16_t ONTIME_MASK=0x07;
  int writePointer=0;
  bool hasWrapped=false;
  unsigned long lastWriteTime=0; //this is the time we have written our last entry
  unsigned long reportedOnTime=0;
  VictronReceiver *victron;
  Controller *controller;

  uint16_t onTimeToReport(unsigned long onTimeInSeconds, unsigned long reportedOnTime){
    //we have to be carefull when multiplying seocnds
    //as we cannot "waste" any bits
    //so we need some 64 bit arithmetics
    uint64_t reported=(uint64_t)reportedOnTime * (uint64_t)7/(uint64_t)TIME_INTERVAL;
    uint64_t diff=((uint64_t)onTimeInSeconds-reported)*(uint64_t)7/(uint64_t)TIME_INTERVAL;
    if (diff > 7) diff=7;
    return diff;
  }

  unsigned long reportTimeToOnTime(uint16_t reportTime){
    return (unsigned long)reportTime*(unsigned long)TIME_INTERVAL/7;
  }

  uint16_t dataToEntry(int voltage,Controller::State state,uint16_t reportTime){
    uint16_t rt=0;
    voltage=voltage/100;
    if (voltage <= 60) voltage=0;
    else voltage=voltage-60;
    if (voltage > 255) voltage=255;
    rt|=(uint16_t)(voltage & VOLTAGE_MASK)<<VOLTAGE_SHIFT;
    rt|=((uint16_t)state & STATE_MASK) << STATE_SHIFT;
    rt|=reportTime & ONTIME_MASK;
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

   
  bool writeEntry(int voltage,Controller::State state,uint16_t timeToReport){
    if(hdebug){
      Serial.print("##write entry: ");
      Serial.print(writePointer,10);
      Serial.print(",");
      Serial.println(hasWrapped,2);
    }
    history[writePointer]=dataToEntry(voltage,state,timeToReport);
    writePointer++;
    if (writePointer >= HIST_MAX){
      writePointer=0;
      hasWrapped=true;
    }
  }

   void addHistory(unsigned long timestamp){
    //normally we should have exactly 1 entry we write
    //but if the loop gets heavily delayed, more time could have elapsed
    //in this case we potentially simply write the same values multiple times (except for the on time)
    int numEntries=lastWriteTime?(timestamp-lastWriteTime)/TIME_INTERVAL:1;
    if (numEntries < 1) return; //should not happen...
    int voltage=0;
    if (victron-> valuesValid()) voltage=victron->getInfo()->voltage/100;
    Controller::State state=controller->getState();
    unsigned long currentOnTime=controller->getCumulativeOnTime();
    uint16_t reportTime=onTimeToReport(currentOnTime,reportedOnTime)/numEntries;
    for (int i=0;i<numEntries;i++){
      writeEntry(voltage,state,reportTime);
      reportedOnTime+=reportTime;
    }
  }

  
  public:
  History(VictronReceiver *victron,Controller * controller){
    this->controller=controller;
    this->victron=victron;
  }
  void loop(){
    unsigned long now=TimeBase::timeSeconds();
    if (lastWriteTime == 0 || (now-lastWriteTime) >= TIME_INTERVAL){
      addHistory(now);
      lastWriteTime=now;
    }
  }
  int numEntries(){
    if (! hasWrapped) return writePointer;
    return HIST_MAX;
  }
  int lastWrittenEntry(){
    if (! hasWrapped){
      return writePointer-1;
    }
    if (writePointer > 0) return writePointer-1;
    return HIST_MAX-1;
  }
  void writeHistory(Receiver *out){
    int count=numEntries();
    if (! count) return;
    int current=lastWrittenEntry();
    if (current < 0) return;
    char buf[10];
    out->sendSerial("TS=");
    unsigned long now=TimeBase::timeSeconds();
    out->sendSerial(ltoa(now,buf,10),true);
    unsigned long diff=now-lastWriteTime;
    while (count >0){
      uint16_t entry=history[current];
      out->sendSerial("TE=");
      out->sendSerial(ltoa(diff,buf,10));
      out->sendSerial(",");
      out->sendSerial(ltoa(voltageFromEntry(entry),buf,10));
      out->sendSerial(",");
      out->sendSerial(Controller::statusToString(stateFromEntry(entry)));
      out->sendSerial(",");
      out->sendSerial(ltoa(secondsFromEntry(entry),buf,10),true);
      diff+=TIME_INTERVAL;
      current-=1;
      if (current < 0) current=HIST_MAX-1;
      count--;
    }
  }
  
  
};

#endif
