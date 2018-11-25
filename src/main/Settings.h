#ifndef SETTINGS_H
#define SETTINGS_H
#include <Arduino.h>
#include <EEPROM.h>
/**
 * a simple class to write and read settings from to eeprom
 * each setting is a 16 bit value
 */

typedef struct {
  const char* name;
  int offset;
  int defaultValue;
} SettingItem;

const SettingItem settings[]={
  //typically 0 means item is off
  {"Enabled",sizeof(int),1},
  {"FloatTime",2*sizeof(int),10},       //float time in minutes before switching on
  {"MinTime",3*sizeof(int),30},         //minimal on time (minutes) (except for emergency off)
  {"KeepOnVoltage",4*sizeof(int),12500},//voltage(mv) if battery is above - keep on
  {"OffVoltage",5*sizeof(int),11800},   //voltage(mv) if below - immediately switch off
  {"MaxTime",6*sizeof(int),120},       //max time (in minutes) we keep on before we wait for float again
  {"StatusInterval",7*sizeof(int),5}       //time in s between status reports
};
class Settings{
  public:
  Settings();

  private:
  static const int MAGIC=0xfafa;
  static int itemOffset(const char* item){
    int idx=itemIndex(item);
    if (idx <0) return -1;
    return settings[idx].offset;
  }
  static bool validIndex(int idx){
    if (idx < 0 || idx >= (sizeof(settings)/sizeof(SettingItem))) return false;
    return true;
  }

  public:
  static int itemIndex(const char * item){
    for (int i=0;i<(sizeof(settings)/sizeof(SettingItem));i++){
      if (strcasecmp(settings[i].name,item)==0){
        return i;
      }
    }
    return -1;
  }

  static int getCurrentValue(const char *name){
    return getCurrentValue(itemIndex(name));
  }
  static int getCurrentValue(int idx){
    if (!validIndex(idx)) return 0;
    int rt=0;
    EEPROM.get(settings[idx].offset,rt);
    return rt;
  }

  static bool setCurrentValue(const char *name, int value){
    return setCurrentValue(itemIndex(name),value);
  }
  static bool setCurrentValue(int idx, int value){
    if (! validIndex(idx)) return false;
    EEPROM.put(settings[idx].offset,value);
    return true; 
  }

  static void reset(bool force=true){
    int magic;
    if (! force){
      EEPROM.get(0,magic);
      if (magic == MAGIC) return; 
    }
    magic=MAGIC;
    EEPROM.put(0,magic);
    for (int idx =0 ;idx < (sizeof(settings)/sizeof(SettingItem));idx++){
      EEPROM.put(settings[idx].offset,settings[idx].defaultValue);
    }
  }

  static void printSettings(Receiver* out){
    out->sendSerial("#SETTINGS",true);
    for (int idx =0 ;idx < (sizeof(settings)/sizeof(SettingItem));idx++){
      out->sendSerial(settings[idx].name);
      out->sendSerial("=");
      char buf[10];
      out->sendSerial(ltoa(getCurrentValue(idx),buf,10),true);
    }
    out->sendSerial("#END",true);
    
  }
  
};
#endif
