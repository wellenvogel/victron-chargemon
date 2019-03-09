import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import ManagedInput from './components/ManagedInput.jsx';
import Constants from './components/Constants.js';
import Store from './components/Store.js';
import CommandTheme from './style/theme/commands.less';

const BASEURL='/control/raw?cmd=';
const COMMANDS={
    state: 'state',
    set: 'show',
    history: 'history',
    teston: 'teston',
    testoff: 'testoff'
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
        this.state={command:undefined,running:false};
        this.command='state';
        Store.setValue(COMMANDKEY,'state');
        this.goBack=this.goBack.bind(this);
        this.onOkClick=this.onOkClick.bind(this);
        this.changeCommand=this.changeCommand.bind(this);
        this.setError=this.setError.bind(this);
        this.startCommand=this.startCommand.bind(this);
        this.runCommand=this.runCommand.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
        this.startFreeCommand=this.startFreeCommand.bind(this);
    }
    setError(err){
        this.setState({error:err,data:undefined,running:false});
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
            self.setState({error:undefined,data:jsonData.data,running:false});
        })

    }
    startFreeCommand(){
        this.startCommand();
    }
    startCommand(opt_Command){
        let cmd=opt_Command||this.command;
        this.command=cmd;
        this.setState({command:cmd,running:true});
        this.runCommand(cmd);
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
                  <div className="commandInputFrame">
                  <ManagedInput
                      className='commandInput'
                      type='text'
                      label='Free Command'
                      onChange={self.changeCommand}
                      value={self.command}
                      onKeyPress={self.onKeyPress}
                      theme={CommandTheme}
                      />
                  </div>
                  <div className="freeCommandFrame">
                    <Button className="runCommandButton" onClick={self.startFreeCommand} theme={CommandTheme}>Start</Button>
                  </div>
                  <div className="fixedCommands">
                      {Object.keys(COMMANDS).map(function(cmd){
                          return (
                              <div className='fixedCommandFrame'>
                              <Button className="fixedCommandButton"
                                      onClick={function(){self.startCommand(cmd)}}
                                      theme={CommandTheme}
                                      key={cmd}
                                  >{COMMANDS[cmd]}

                              </Button>
                              </div>
                          )
                      })}
                  </div>
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
        let Running=function(props){
          return(
              <div className="runningIndicator">
                  Loading...</div>
          );
        };
        return (
            <div className="view settingsView">
                <ToolBar >
                    <Button className="buttonBack" onClick={this.onOkClick}/>
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                </ToolBar>
                <Command/>
                {this.state.running ?
                    <Running/>:
                    <Result data={this.state.data}/>
                }
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
