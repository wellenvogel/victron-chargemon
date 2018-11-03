#include <Arduino.h>
#ifndef _SERIAL_RECEIVER_H
#include "Receiver.h"
#define SERIAL_MAXSIZE 32
class SerialReceiver: public Receiver{
  public:
  SerialReceiver(Callback *cb):Receiver(cb,SERIAL_MAXSIZE){
  }
  void init(int baud){
    Serial.begin(baud);
  }
  void loop(){
    while (Serial.available() > 0) {
    int c = Serial.read();
    if (c < 0) return;
    receiveByte(c);
    loopAction();
  }
  }
  virtual void sendSerial(const char *txt,bool nl=false){
    if (! nl) Serial.print(txt);
    else Serial.println(txt);
  }
  
};
#define _SERIAL_RECEIVER_H
#endif
