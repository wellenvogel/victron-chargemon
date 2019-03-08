import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import IconButton from 'react-toolbox/lib/button';


const url="Example.json";
class ExampleView extends Component {

    constructor(props){
        super(props);
        this.state=props;
        this.goBack=this.goBack.bind(this);
        this.onOkClick=this.onOkClick.bind(this);
    }
    componentDidMount(){
        let self=this;
        fetch(url,{
            credentials: 'same-origin'
        }).then(function(response){
            if (! response.ok){
                alert("Error: "+response.statusText);
                throw new Error(response.statusText)
            }
            return response.json()
        }).then(function(jsonData){
            self.setState(jsonData||{});
        })

    }
    render() {
        let info=this.state;
        let title=info.title||"ExampleView";
        return (
            <div className="view exampleView">
                <ToolBar leftIcon="arrow_back"
                    leftClick={this.goBack}>
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                    <IconButton icon="done" onClick={this.onOkClick}/>
                </ToolBar>
                {info.content?
                    <p>{info.content}</p>
                :
                <p>Loading...</p>
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


export default ExampleView;
