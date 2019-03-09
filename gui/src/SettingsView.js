import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import ManagedInput from './components/ManagedInput.jsx';
import Constants from './components/Constants.js';
import Store from './components/Store.js';

const BASEURL='/control/raw?cmd=';
const COMMANDS={
    state: 'state',
    show: 'set',
    history: 'history',
    teston: 'teston',
    testoff: 'testoff',
    set: 'set'
};
const buildUrl=function(command){
    let url=BASEURL;
    url+=encodeURIComponent(command);
    return url;
};
const COMMANDKEY=Constants.keys.settings.command;
class SettingsView extends Component {

    constructor(props){
        super(props);
        this.state={command:undefined};
        this.command='state';
        Store.setValue(COMMANDKEY,'state');
        this.goBack=this.goBack.bind(this);
        this.onOkClick=this.onOkClick.bind(this);
        this.changeCommand=this.changeCommand.bind(this);
        this.setError=this.setError.bind(this);
        this.startCommand=this.startCommand.bind(this);
        this.runCommand=this.runCommand.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
    }
    setError(err){
        this.setState({error:err,data:undefined});
    }
    runCommand(cmd){
        let self=this;
        let url=buildUrl(cmd);
        if (! url){
            this.setError("unknown command "+cmd);
            return;
        }
        fetch(url,{
            credentials: 'same-origin'
        }).then(function(response){
            if (! response.ok){
                self.setError(response.statusText);
                return null;
            }
            return response.json()
        }).then(function(jsonData){
            if (jsonData.status !== 'OK'){
                self.setError(jsonData.info)
            }
            self.setState({error:undefined,data:jsonData.data});
        })

    }
    startCommand(){
        this.setState({command:this.command});
        this.runCommand(this.command);
    }
    changeCommand(newval){
        //intentionally no state here as the input handles it ...
        this.command=newval;
    }
    onKeyPress(key){
        console.log("keypress "+key);
        if (key.key && key.key === 'Enter'){
            this.startCommand();
        }
    }
    render() {
        let title="Settings";
        let self=this;
        let Command=function(props){
            return (
              <div className={"commandBox "+(props.className?props.className:'')}>
                  <ManagedInput
                      className='commandInput'
                      type='text'
                      label='Command'
                      onChange={self.changeCommand}
                      value={self.command}
                      onKeyPress={self.onKeyPress}
                      />
                  <Button className="runCommandButton" onClick={self.startCommand}>Start</Button>
              </div>
            );
        };
        let Result=function(props){
          return (
              <div className={"commandResult "+(props.className?props.className:"")}>
                  {props.data?props.data.join("\n"):null}
              </div>
          )
        };
        return (
            <div className="view settingsView">
                <ToolBar >
                    <Button className="buttonBack" onClick={this.onOkClick}/>
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                </ToolBar>
                <Command/>
                <Result data={this.state.data}/>
            </div>
        );
    }
    goBack(){
        this.props.history.goBack();
    }
    onOkClick(ev){
        let self=this;
        console.log("ok clicked");
        /*
        fetch(updateUrl,{
            credentials: 'same-origin',
            method: 'post',
            body: data

        }).then(function(response){
            if (! response.ok){
                alert("Error: "+response.statusText);
                throw new Error(response.statusText)
            }
            return response.json()
        }).then(function(jsonData){
            if (! jsonData.STATUS || jsonData.STATUS != "OK"){
                alert("Error: update failed "+jsonData.INFO);
            }
            self.goBack();
        })
        */
        self.goBack();
    }
}


export default SettingsView;
