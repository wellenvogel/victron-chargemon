#ifndef HISTORY_H
#define HISTORY_H
#include <Arduino.h>
//number of entries in the history list
#define HIST_MAX 300
//bits per history entry (multiple of 8)
#define HIST_BPE 24
//bits for the time per entry
#define HIST_TBITS 20
//factor the timestamp seconds should be divided
//this determines together with the bits and the size how far we can go back
//maxtime is (1 << HISTTBITS)/2 -1 in units of HIST_FACTOR 
#define HIST_FACTOR 120

class History{
  public:
  //for the enum the first 8 entries are the states for teh Controller
  typedef enum{
    Start=8,
    Connected=9,
    Disconnected=10,
    OutputOn=11,
    OutputOff=12,
    UnderVoltage=13
  }Event; //the number of enum entries must fit into HIST_BITPE-HIST_TBITS Bits
  public:
  static byte history[HIST_MAX*HIST_BPE/8];
  static const unsigned long TIMEMASK=((unsigned long)1<<HIST_TBITS)-1;
  static const unsigned long CAUSEMASK=((unsigned long)1<<(HIST_BPE-HIST_TBITS))-1;
  static const unsigned long ENTRYSIZE=HIST_BPE/8;
  static const unsigned long ARRAYSIZE=HIST_MAX*ENTRYSIZE;
  static int writePointer;
  static int startPointer;
  static long lastCleanUp;
  public:
  static unsigned long getEntry(long timeSeconds,byte cause){
    unsigned long rt=((unsigned long)(timeSeconds/(unsigned long)HIST_FACTOR) & TIMEMASK) + ((unsigned long)(cause & CAUSEMASK) << HIST_TBITS);
    return rt;
  }
  static bool validOffset(int startByte){
    if (startByte<0 || (startByte+ENTRYSIZE) >= ARRAYSIZE) return false;
    return true;
  }
  static bool writeEntry(int startByte,unsigned long entry){
    if (! validOffset(startByte)) return false;
    for (byte i=0;i< ENTRYSIZE;i++){
      history[startByte]=entry & 0xff;
      startByte++;
      entry >>=8;
    }
  }
  static unsigned long readEntry(int startByte){
    if (!validOffset(startByte)) return 0;
    unsigned long rt=0;
    for (int i=ENTRYSIZE-1;i>=0;i--){
      rt|=history[startByte+i];
      if (i>0) rt<<=8;
    }
    return rt;
  }
  static unsigned long timeStampFromEntry(unsigned long entry){
    return (unsigned long)(entry & TIMEMASK)*HIST_FACTOR;
  }
  static byte causeFromEntry(unsigned long entry){
    return (entry >> HIST_TBITS) & CAUSEMASK;
  }

  public:
  static void addEntry(long timeSeconds,byte cause){
    writeEntry(writePointer,getEntry(timeSeconds,cause));
    writePointer+=ENTRYSIZE;
    if ((writePointer+ENTRYSIZE) >= ARRAYSIZE){
      writePointer=0;
      startPointer=writePointer+ENTRYSIZE; 
    }
  }
  static int numEntries(){
    if (writePointer > startPointer) return (writePointer-startPointer)/ENTRYSIZE;
    return writePointer/ENTRYSIZE + (ARRAYSIZE-startPointer)/ENTRYSIZE;
  }
  static void writeHistory(Receiver *out){
    int current=startPointer;
    char buf[10];
    out->sendSerial("TS=");
    out->sendSerial(ltoa(TimeBase::timeSeconds(),buf,10),true);
    while (current < writePointer){
      unsigned long entry=readEntry(current);
      out->sendSerial("TE=");
      out->sendSerial(ltoa(timeStampFromEntry(entry),buf,10));
      out->sendSerial(",");
      out->sendSerial(ltoa(causeFromEntry(entry),buf,10),true);
      current+=ENTRYSIZE;
      if (current >= ARRAYSIZE) current=0;
    }
  }
  
  
};
static int History::writePointer=0;
static int History::startPointer=0;
static long History::lastCleanUp=0;
static byte History::history[HIST_MAX*HIST_BPE/8];

#endif
