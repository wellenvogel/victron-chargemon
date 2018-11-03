#ifndef _CALLBACK_H
#define _CALLBACK_H
class Callback{
  public:
  Callback(){}
  virtual void callback(const char * data)=0;
};
#endif
