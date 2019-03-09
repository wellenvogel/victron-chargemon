import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';
import ManagedInput from './ManagedInput.jsx';
import ManagedDropdown from './ManagedDropdown.jsx'
const SETTINGS=[
    "Enabled",
    "FloatTime",
    "MinTime",
    "KeepOnVoltage",
    "OffVoltage",
    "MaxTime",
    "StatusInterval",
    "HistorySize",
    "HistoryInterval",
    "TestOnTime",
    "DebugTimeShift"
];

const buildSetSelect=function(){
    let rt=[];
    SETTINGS.map(function(st){
        rt.push({label:st,value:st})
    });
    return rt;
};

class SetCommand extends Component{
    constructor(props){
        super(props);
        this.splitCommand(this.props.value);
        this.nameChanged=this.nameChanged.bind(this);
        this.valueChanged=this.valueChanged.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
        this.splitCommand=this.splitCommand.bind(this);
    }
    buildCommand(){
        return "set "+(this.name||'')+" "+(this.value||'');
    }
    splitCommand(cmd){
        if (! cmd) return;
        let cp=cmd.split(/  */);
        if (cp.length < 3) return;
        this.name=cp[1];
        this.value=cp[2];
    }
    nameChanged(value){
        this.name=value;
        if (this.props.onChange){
            this.props.onChange(this.buildCommand());
        }
    }
    valueChanged(value){
        this.value=value;
        if (this.props.onChange){
            this.props.onChange(this.buildCommand());
        }
    }
    onKeyPress(key){
        if (this.props.onKeyPress){
            this.props.onKeyPress(key);
        }
    }
    render(){
        return(
        <div className={'setCommand '+(this.props.className?this.props.className:"")}>
            <ManagedDropdown
                className="setName "
                label="Name"
                value={this.name}
                onChange={this.nameChanged}
                source={buildSetSelect()}
                theme={this.props.theme?this.props.theme:undefined}
                >
            </ManagedDropdown>
            <ManagedInput
                className="setValue "
                label="Value"
                value={this.value}
                onChange={this.valueChanged}
                type="text"
                onKeyPress={this.onKeyPress}
                theme={this.props.theme?this.props.theme:undefined}
                >
            </ManagedInput>
        </div>
    )
    }
}
SetCommand.propTypes={
    onChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func,
    theme: PropTypes.object,
    value: PropTypes.string
};
export default SetCommand;
