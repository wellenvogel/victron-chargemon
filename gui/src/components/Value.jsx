import React,{Component} from 'react';
import theme from '../style/theme/value.less';
import assign from 'object-assign';
import Helper from './Helper.js';

/**
 * get some additional class depending on the current value
 * @param key
 * @param value
 */
const classForValue=function(key,value){
    let rt="";
    switch(key){
        case('Connection'):
            if (value == 'OK') rt='ok';
            else rt='fail';
            break;
        case('COutput'):
            if (value == 'On') rt='on';
            else rt='off';
            break;
        case('CState'):
            if (value == 'OnExtended') rt='on';
            if (value == 'OnMinTime') rt='on';
            if (value == 'TestOn') rt='on';
            if (value == 'WaitFloat') rt='waiting';
            break;
    }
    return rt;
};
export default function(props){
    let dp=assign({},{theme:theme},props);
    if (! props.definition) return null;
    let val=props.value;
    let unit=props.definition.unit;
    if (props.definition.unit == 's'){
        val=Helper.secondsToTime(val||0);
        unit='';
    }
    return(
        <div className={props.className+" valueDisplay "+classForValue(props.definition.name,props.value)}>
            <div className="name">{props.definition.display}</div>
            <div className="value">{val||""}</div>
            <div className="unit">{unit||""}</div>
        </div>
    )

}