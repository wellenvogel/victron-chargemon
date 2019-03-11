#ifndef SETTINGS_H
#define SETTINGS_H
#include <Arduino.h>
#include <EEPROM.h>
/**
 * a simple class to write and read settings from to eeprom
 * each setting is a 16 bit value
 */

#define SETTINGS_ENABLED          "Enabled"
#define SETTINGS_FLOAT_TIME       "FloatTime"
#define SETTINGS_MIN_TIME         "MinTime"
#define SETTINGS_KEEP_VOLTAGE     "KeepOnVoltage"
#define SETTINGS_OFF_VOLTAGE      "OffVoltage"
#define SETTINGS_MAX_TIME         "MaxTime"
#define SETTINGS_STATUS_INTERVAL  "StatusInterval"
#define SETTINGS_HISTORY_SIZE     "HistorySize"
#define SETTINGS_HISTORY_INTERVAL "HistoryInterval"
#define SETTINGS_ON_TIME          "TestOnTime"
#define SETTINGS_SPEED_UP         "DebugTimeShift"

#define NUMSETTINGS (sizeof(settings)/sizeof(SettingItem))
class Settings{
  public:
  Settings();
  private:
  static const int MAGIC=0xfafb;
  class SettingItem {
    public:
    const char* name;
    int defaultValue;
    int minValue=0;
    int maxValue=0;
    SettingItem(const char *name,int defaultValue,int minValue=-1,int maxValue=-1){
      this->name=name;
      this->defaultValue=defaultValue;
      this->minValue=minValue;
      this->maxValue=maxValue;
    }
  } ;
  static const SettingItem settings[11]; //keep this consistent with the initializer
 
  static bool validIndex(byte idx){
    if (idx < 0 || idx >= NUMSETTINGS) return false;
    return true;
  }

  static byte itemOffset(byte idx){
    if (! validIndex(idx)) return -1; 
    return 3 + idx*sizeof(int);
  }

  public:
  static byte itemIndex(const char * item){
    for (byte i=0;i<NUMSETTINGS;i++){
      if (strcasecmp(settings[i].name,item)==0){
        return i;
      }
    }
    return -1;
  }

  static int getCurrentValue(const char *name){
    return getCurrentValue(itemIndex(name));
  }
  static int getCurrentValue(byte idx){
    if (!validIndex(idx)) return 0;
    int rt=0;
    EEPROM.get(itemOffset(idx),rt);
    return rt;
  }

  static bool setCurrentValue(const char *name, int value){
    return setCurrentValue(itemIndex(name),value);
  }
  static bool setCurrentValue(byte idx, int value){
    if (! validIndex(idx)) return false;
    SettingItem *item=&settings[idx];
    if (item->minValue != -1 && value < item->minValue) return false;
    if (item->maxValue != -1 && value > item->maxValue) return false;
    EEPROM.put(itemOffset(idx),value);
    return true; 
  }

  static bool reset(bool force=true){
    int magic;
    byte numItems;
    if (! force){
      EEPROM.get(0,magic);
      EEPROM.get(2,numItems);
      if (magic == MAGIC && numItems == NUMSETTINGS) return false; 
    }
    magic=MAGIC;
    EEPROM.put(0,magic);
    EEPROM.put(2,NUMSETTINGS);
    for (int idx =0 ;idx < NUMSETTINGS;idx++){
      EEPROM.put(itemOffset(idx),settings[idx].defaultValue);
    }
    return true;
  }

  static void printSettings(Receiver* out, Callback * cb=NULL,int num=0){
    out->writeNumberPrefix(num);
    out->sendSerial("#SETTINGS",true);
    for (byte idx =0 ;idx < NUMSETTINGS;idx++){
      if (idx > 4 && (idx %5) == 0 && cb){
        cb->callback(NULL);
      }
      out->writeNumberPrefix(num);
      out->sendSerial(settings[idx].name);
      out->sendSerial("=");
      out->sendSerial(getCurrentValue(idx),true);
    }
  }
  
};
const Settings::SettingItem Settings::settings[] ={
  //typically 0 means item is off
  {SETTINGS_ENABLED,1},
  {SETTINGS_FLOAT_TIME,600},              //float time in seonds before switching on
  {SETTINGS_MIN_TIME,30*60},              //minimal on time (seconds) (except for emergency off)
  {SETTINGS_KEEP_VOLTAGE,12600},          //voltage(mv) if battery is above - keep on
  {SETTINGS_OFF_VOLTAGE,12300},           //voltage(mv) if below - immediately switch off (emergency)
  {SETTINGS_MAX_TIME,120*60},             //max time (in seconds) we keep on before we wait for float again
  {SETTINGS_STATUS_INTERVAL,5},           //time in s between status reports
  {SETTINGS_HISTORY_SIZE,180,10,240},     //number of entries in history, be carefull with the max. - memory exhausted... - default for 20h
                                          //if too big the history will not be created at all
  {SETTINGS_HISTORY_INTERVAL,480,2,3600}, //interval in seconds between history entries - default 8 minutes
  {SETTINGS_ON_TIME,300,0,3600},          //time to stay on for testing (seconds)
  {SETTINGS_SPEED_UP,0,0,8}               //speed up handling by 2^thisValue
  };

#endif
