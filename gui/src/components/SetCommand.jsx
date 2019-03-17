import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';
import ManagedInput from './ManagedInput.jsx';
import ManagedDropdown from './ManagedDropdown.jsx'
import Helper from './Helper.js';
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

const CMDURL='/control/command/?cmd=';

class SetCommand extends Component{
    constructor(props){
        super(props);
        this.state={};
        this.splitCommand(props.value);
        this.nameChanged=this.nameChanged.bind(this);
        this.valueChanged=this.valueChanged.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
        this.splitCommand=this.splitCommand.bind(this);
        this.fetchSettings=this.fetchSettings.bind(this);
        this.setCurrentValue=this.setCurrentValue.bind(this);
    }
    buildCommand(name,value){
        return "set "+(name||'')+" "+(value||'');
    }
    splitCommand(cmd,callSet){
        if (! cmd) return;
        let cp=cmd.split(/  */);
        if (cp.length < 3) {
            return;
        }
        this.state={
            name:cp[1],
            value:cp[2]
        };

    }
    nameChanged(value){
        this.setState({name:value});
        if (this.props.onChange){
            this.props.onChange(this.buildCommand(value,this.state.value));
        }
        this.fetchSettings();
    }
    valueChanged(value){
        this.setState({value:value});
        if (this.props.onChange){
            this.props.onChange(this.buildCommand(this.state.name,value));
        }
    }
    fetchSettings(){
        let self=this;
        let url=CMDURL+"set";
        fetch(url,{
            credentials: 'same-origin'
        }).then(function(response){
            if (! response.ok){
                return null;
            }
            return response.json()
        }).then(function(jsonData){
            if (jsonData.status !== 'OK'){
                return;
            }
            self.setCurrentValue(jsonData.data);
        })
    }

    setCurrentValue(responseData){
        this.valueChanged(Helper.findFromDataArray(responseData,this.state.name,true));
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
                value={this.state.name}
                onChange={this.nameChanged}
                source={buildSetSelect()}
                theme={this.props.theme?this.props.theme:undefined}
                >
            </ManagedDropdown>
            <ManagedInput
                className="setValue "
                label="Value"
                value={this.state.value}
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
