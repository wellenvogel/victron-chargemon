#ifndef TIMEBASE_H
#define TIMEBASE_H
#include <Arduino.h>
class TimeBase{
  private:
  static unsigned long overflowCounter;
  static unsigned long lastMillis;
  public:
  static unsigned long timeSeconds(){
    unsigned long current=millis();
    if (current < lastMillis){
      overflowCounter++;
    }
    lastMillis=current;
    //we make some simple arithmetics here
    //and consider a second to be 1024 ms
    //for exact timings this needs to be handled outside
    current=(current >> 10) | (overflowCounter << 24);
    return current;
  }
};

unsigned long TimeBase::overflowCounter=0;
unsigned long TimeBase::lastMillis=0;
#endif
