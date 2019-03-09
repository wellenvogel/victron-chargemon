import React,{Component} from 'react';
import theme from '../style/theme/value.less';
import assign from 'object-assign';

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
            if (value == 'FloatTime') rt='waiting';
            break;
    }
    return rt;
};
export default function(props){
    let dp=assign({},{theme:theme},props);
    if (! props.definition) return null;
    return(
        <div className={props.className+" valueDisplay "+classForValue(props.definition.name,props.value)}>
            <div className="name">{props.definition.display}</div>
            <div className="value">{props.value||""}</div>
            <div className="unit">{props.definition.unit||""}</div>
        </div>
    )

}