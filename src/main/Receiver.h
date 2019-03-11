#include <Arduino.h>
#ifndef _RECEIVER_H
#define _RECEIVER_H
#define FH(x) (const __FlashStringHelper *)(x)
#define PM(n,value) static const PROGMEM char n[]=value
#include "Callback.h"
int rdebug=0;
PM(CNWB,"NextWriteBuffer=");
PM(CNRB2,"NextReadBuffer(2)=");
PM(CNRB3,"NextReadBuffer(3)=");
PM(CNRB1,"NextReadBuffer(1)=");
PM(CRESULT,"#RESULT");
PM(CERROR," ERROR ");
PM(COK," OK");
class Receiver{
  protected:
    Callback *callback;
    class ReceiveBuffer {
      public:
      typedef enum {
        Normal,
        LineReceived,
        Overflow
      } ReceiveResult;
      bool lineReceived=false;
      char *receivedData;
      byte receivedBytes=0;
      byte maxBytes=0;
      ReceiveBuffer(byte size){
        receivedData=new char[size+1];
        maxBytes=size;
        lineReceived=false;
        receivedBytes=0;
      }
      ~ReceiveBuffer(){
        delete [] receivedData;
      }
      void reset(){
        receivedBytes=0;
        lineReceived=false;
      }
      ReceiveResult receiveByte(char c){
        if (lineReceived) return Overflow;
        if (c == '\n' || receivedBytes >= maxBytes) {
          if (receivedBytes >= maxBytes) receivedBytes=maxBytes;
          receivedData[receivedBytes] = 0;
          lineReceived=true;
          return LineReceived;
        }
        receivedData[receivedBytes] = c;
        receivedBytes++;
        return Normal;
      }
    };
    typedef ReceiveBuffer* ReceiveBufferP;
    ReceiveBuffer **buffers;
    byte numBuffers=0;
    byte writeBuffer=0;
    byte readBuffer=0;
    bool hasOverflow=false;

    ReceiveBuffer * getWriteBuffer(){
      return buffers[writeBuffer];
    }
    ReceiveBuffer * getReadBuffer(){
      return buffers[readBuffer];
    }
    void nextWriteBuffer(){
      byte nextWrite=writeBuffer+1;
      if (nextWrite >= numBuffers) nextWrite=0;
      writeBuffer=nextWrite;
      if (rdebug){
        Serial.print(FH(CNWB));
        Serial.println(writeBuffer,10);
      }
    }
    void nextReadBuffer(){
      byte nextRead=readBuffer+1;
      if (nextRead >= numBuffers) nextRead=0;
      readBuffer=nextRead;
      if (getReadBuffer()->lineReceived) {
        if (rdebug){
          Serial.print(FH(CNRB1));
          Serial.println(readBuffer,10);
        }
        return;
      }
      //maybe something went wrong - so try if there is another buffer that already has data
      
      byte candidate=readBuffer+1;
      for (byte i=0;i< (numBuffers-1);i++){
        if (candidate >= numBuffers) candidate=0;
        if (buffers[candidate]->lineReceived){
          readBuffer=candidate;
          if (rdebug){
            Serial.print(FH(CNRB2));
            Serial.println(readBuffer,10);
          }
          return;
        }
        candidate++;
      }
      
      if (rdebug){
        Serial.print(FH(CNRB3));
        Serial.println(readBuffer,10);
      }
    }
  public:
  Receiver(Callback *cb,byte maxSize, byte numBuffers){
    callback=cb;
    buffers=new ReceiveBufferP[numBuffers];
    this->numBuffers=numBuffers;
    for (byte i=0;i<numBuffers;i++){
      buffers[i]=new ReceiveBuffer(maxSize);
    }
    hasOverflow=false;
  }
  virtual ~Receiver(){
    for (byte i=0;i<numBuffers;i++){
      delete buffers[i];
    }
    delete [] buffers;
  }
  void setCallback(Callback *cb){
    callback=cb;  
  }
  void receiveByte(char c){
    ReceiveBuffer *rb=getWriteBuffer();
    ReceiveBuffer::ReceiveResult rs=rb->receiveByte(c);
    if (rs==ReceiveBuffer::Overflow){
      hasOverflow=true;
      return;
    }
    if(rs==ReceiveBuffer::LineReceived){
      nextWriteBuffer();
    }
  }
  protected:
  void loopAction(){
    ReceiveBuffer *rs=getReadBuffer();
    if (rs->lineReceived){
      if (callback != NULL) callback->callback(rs->receivedData);
      rs->reset();
      nextReadBuffer();
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

  void sendSerial(long v,bool nl=false){
    char buf[10];
    sendSerial(ltoa(v,buf,10),nl);
  }

  //for some very strange reason the overloading
  //does not work for the main file...
  void sendSeriali(long v,bool nl=false){
    sendSerial(v,nl);
  }

  void writeNumberPrefix(int num){
    if (! num) return;
    sendSerial(num);
    sendSerial(" ");
  }

  void sendResult(int num,const char *error){
    writeNumberPrefix(num);
    sendSerial(FH(CRESULT));
    if ( ! error){
      sendSerial(FH(COK),true);
      return;
    }
    sendSerial(FH(CERROR));
    sendSerial(error,true);
  }
  void sendResult(int num){
    writeNumberPrefix(num);
    sendSerial(FH(CRESULT));
    sendSerial(FH(COK),true);
  }
  void sendResult(int num,const __FlashStringHelper *error){
    writeNumberPrefix(num);
    sendSerial(FH(CRESULT));
    if ( ! error){
      sendSerial(FH(COK),true);
      return;
    }
    sendSerial(FH(CERROR));
    sendSerial(error,true);
  }

  virtual void sendSerial(const char * txt, bool nl=false)=0;
  virtual void sendSerial(const __FlashStringHelper *txt,bool nl=false)=0;
 
  
};
#define _RECEIVER_H
#endif
