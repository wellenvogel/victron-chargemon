import React,{Component} from 'react';
import theme from '../style/theme/value.less';
import assign from 'object-assign';

export default function(props){
    let dp=assign({},{theme:theme},props);
    if (! props.definition) return null;
    return(
        <div className={props.className+" valueDisplay"}>
            <div className="name">{props.definition.display}</div>
            <div className="value">{props.value||""}</div>
            <div className="unit">{props.definition.unit||""}</div>
        </div>
    )

}