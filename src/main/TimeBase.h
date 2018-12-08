#ifndef TIMEBASE_H
#define TIMEBASE_H
#include <Arduino.h>
//a number of bits to shift the time to speed up
#define DEBUG_SPEED_UP 3 
//32 bit seconds - about 136 years
class TimeBase{
  private:
  static unsigned long overflowCounter;
  static unsigned long lastMillis;
  public:
  static unsigned long timeSeconds(){
    unsigned long current=millis();
    current >> DEBUG_SPEED_UP;
    if (current < lastMillis){
      overflowCounter++;
    }
    lastMillis=current;
    //we make some simple arithmetics here
    //and consider a second to be 1024 ms
    //for exact timings this needs to be handled outside
    current=(current >> (10 - DEBUG_SPEED_UP)) | (overflowCounter << (24-DEBUG_SPEED_UP));
    return current;
  }
  static unsigned long initial(){
    return (unsigned long)1 << (24-DEBUG_SPEED_UP); //initial value of overflow counter
  }
  static unsigned long secondsSinceStart(){
    return timeSeconds()-initial(); 
  }
};

unsigned long TimeBase::overflowCounter=1; //start at a high value to set all diffs to invalid...
unsigned long TimeBase::lastMillis=0;
#endif
