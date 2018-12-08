#include <NeoSWSerial.h>

#include <Arduino.h>
#ifndef _ALTERNATE_RECEIVER_H
#include "Receiver.h"
#define SERIAL_MAXSIZE 32
class AlternateReceiver: public Receiver{
  private:
  NeoSWSerial *serial;
  static AlternateReceiver *instance; //only one instance can listen
  void receive(uint8_t c){
    receiveByte(c);
  }
  static void isr(uint8_t c){
    if (! instance) return;
    instance->receive(c);
  }
  public:
  AlternateReceiver(Callback *cb,byte rx,byte tx):Receiver(cb,SERIAL_MAXSIZE,3){
    serial=new NeoSWSerial(rx,tx);
    instance=this; //should set instance to NULL on destroy...
    serial->attachInterrupt(isr);
  }
  void init(int baud){
    serial->begin(baud);
  }
  virtual void sendSerial(const char *txt,bool nl=false){
    if (! nl) serial->print(txt);
    else serial->println(txt);
  }
  
};
AlternateReceiver *AlternateReceiver::instance=NULL;
#define _ALTERNATE_RECEIVER_H
#endif
