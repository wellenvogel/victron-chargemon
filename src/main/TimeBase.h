#ifndef TIMEBASE_H
#define TIMEBASE_H
#include <Arduino.h>

//32 bit seconds - about 136 years
class TimeBase{
  private:
  static unsigned long overflowCounter;
  static unsigned long lastMillis;
  static uint8_t debugSpeedUp;
  public:
  static unsigned long timeSeconds(){
    unsigned long current=millis();
    current >> debugSpeedUp;
    if (current < lastMillis){
      overflowCounter++;
    }
    lastMillis=current;
    //we make some simple arithmetics here
    //and consider a second to be 1024 ms
    //for exact timings this needs to be handled outside
    current=(current >> (10 - debugSpeedUp)) | (overflowCounter << (24-debugSpeedUp));
    return current;
  }
  static unsigned long initial(){
    return (unsigned long)1 << (24-debugSpeedUp); //initial value of overflow counter
  }
  static unsigned long secondsSinceStart(){
    return timeSeconds()-initial(); 
  }
  static uint8_t getDebugSpeedUp(){
    return debugSpeedUp;
  }
  static void setDebugSpeedUp(uint8_t su){
    debugSpeedUp=su;
  }
};

unsigned long TimeBase::overflowCounter=1; //start at a high value to set all diffs to invalid...
unsigned long TimeBase::lastMillis=0;
uint8_t TimeBase::debugSpeedUp=1;
#endif
