#include <Arduino.h>
#ifndef _RECEIVER_H
#define _RECEIVER_H
#include "Callback.h"
class Receiver{
  protected:
    Callback *callback;
    char *receivedData;
    byte receivedBytes;
    byte maxBytes;
    bool lineReceived;
    bool hasOverflow=false;
  public:
  Receiver(Callback *cb,byte maxSize){
    callback=cb;
    receivedBytes=0;
    receivedData=new char[maxSize+1];
    maxBytes=maxSize;
    lineReceived=false;
    }
  void setCallback(Callback *cb){
    callback=cb;  
  }
  virtual ~Receiver(){
    delete receivedData;
  }
  void receiveByte(char c){
    if (lineReceived){
      hasOverflow=true;
      return;
    }
    if (c == '\n' || receivedBytes >= maxBytes) {
      receivedData[receivedBytes] = 0;
      lineReceived=true;
      receivedBytes = 0;
      return;
    }
    receivedData[receivedBytes] = c;
    receivedBytes++;
  }
  protected:
  void loopAction(){
   if (lineReceived){
    if (callback != NULL) callback->callback(receivedData);
    lineReceived=false;
   }
  }
  public:
  virtual void loop(){
    loopAction();
  }
  boolean didOverflow(){
    boolean rt=hasOverflow;
    hasOverflow=false;
    return rt;
  }

  void sendSerial(int v,bool nl=false){
    char buf[10];
    sendSerial(ltoa(v,buf,10),nl);
  }

  virtual void sendSerial(const char * txt, bool nl=false)=0;
 
  
};
#define _RECEIVER_H
#endif
