import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import IconButton from 'react-toolbox/lib/button';
import Value from './components/Value.jsx';
import Constants from './components/Constants.js';
import Store from './components/Store.js';
import ItemUpdater from './components/ItemUpdater.jsx';


const url="control/command?cmd=state";
const ELEMENTS=["V","I","VPV","PPV"];
class MainView extends Component {

    constructor(props){
        super(props);
        this.state=props;
        this.goBack=this.goBack.bind(this);
        this.onOkClick=this.onOkClick.bind(this);
        this.fetchData=this.fetchData.bind(this);
        this.timer=undefined;
    }
    fetchData(){
        let self=this;
        fetch(url,{
            credentials: 'same-origin'
        }).then(function(response){
            self.timer=window.setTimeout(self.fetchData,5000);
            if (! response.ok){
                self.setState({error:response.statusText});
                throw new Error(response.statusText)
            }
            return response.json()
        }).then(function(jsonData){
            if (jsonData.status === 'OK') {
                self.setState({error: undefined, data: true});
                ELEMENTS.forEach(function(el){
                    let elementData=self.findByName(jsonData.data,el);
                    Store.setValue(Constants.keys.main[el],elementData,true);
                });
            }
            else{
                self.setState({error:jsonData.info,data:undefined})
            }
        })
    }
    shouldComponentUpdate(nextProps, nextState){
        if (Store.compare(this.props,nextProps) && Store.compare(this.state,nextState)) return false;
        return true;
    }
    componentDidMount(){
        this.fetchData();
    }
    componentWillUnmount(){
        window.clearTimeout(this.timer);
    }
    findByName(data,name){
        for (let i in data){
            if (data[i].definition && data[i].definition.name === name) return data[i];
        }
        return null;
    }
    render() {
        let info=this.state;
        let title=info.title||"Charger State";
        let self=this;
        let DataDisplay=function(props){
            return(<div className={props.className + " dataDisplay"}>
                    {
                        ELEMENTS.map(function(el){
                            let UValue=ItemUpdater(Value,Store,Constants.keys.main[el]);
                            return <UValue key={el}/>
                        })

                    }
                </div>
            )
        };
        return (
            <div className="view exampleView">
                <ToolBar >
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                    <IconButton icon="done" onClick={this.onOkClick}/>
                </ToolBar>
                {info.data?
                    <DataDisplay />:null
                }
                {info.error?
                    <div className="error">{info.error}</div>
                    :null
                }
                {(!info.data && !info.error) ?
                    <p>Loading...</p> : null
                }
            </div>
        );
    }
    goBack(){
        this.props.history.goBack();
    }
    onOkClick(ev){
        console.log("ok clicked");
        this.props.history.push("/second");
    }
}


export default MainView;
