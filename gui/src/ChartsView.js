import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import { ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts';
import Measure from 'react-measure';

const BASEURL='/control/command?cmd=history';

const DEFAULT_WIDTH=300;
const DEFAULT_HEIGHT=300;

const formatNumber=function(num,digits){
    let rt=num.toFixed(0);
    while(rt.length < digits){
        rt="0"+rt;
    }
    return rt;
};
const formatDate=function(date,withDay){
    let rt={time:formatNumber(date.getHours(),2)+":"+formatNumber(date.getMinutes(),2)};
    if (withDay){
        rt.day=formatNumber(date.getMonth()+1,2)+"/"+formatNumber(date.getDate(),2);
    }
    return rt;
};
const formatDateToText=function(date,withDay){
    let dv=formatDate(date,withDay);
    return dv.day+" "+dv.time;
};
class ChartsView extends Component {

    constructor(props){
        super(props);
        this.state={running:true,width:DEFAULT_WIDTH,height: DEFAULT_HEIGHT};
        this.goBack=this.goBack.bind(this);
        this.fetchData=this.fetchData.bind(this);
        this.setError=this.setError.bind(this);
        this.decodeData=this.decodeData.bind(this);
        this.resizeChart=this.resizeChart.bind(this);

    }
    setError(err){
        this.setState({error:err,data:undefined,running:false});
    }
    fetchData(){
        let self=this;
        this.setState({running:true});

        fetch(BASEURL,{
            credentials: 'same-origin'
        }).then(function(response){
            if (! response.ok){
                self.setError(response.statusText);
                return null;
            }
            return response.json()
        }).then(function(jsonData){
            if (jsonData.status !== 'OK'){
                self.setError(jsonData.info);
                return;
            }
            self.decodeData(jsonData.data);
        })

    }
    decodeData(data) {
        let storeData = data;
        let values=[];
        let min=999999;
        let max=0;
        for (let i in data){
            let item=data[i];
            if (item.definition.name == 'TE'){
                let start=new Date();
                let idx=0;
                for (let pidx=item.value.length-1;pidx >=0;pidx--){
                    let itemValues = item.value[pidx].split(',');
                    if (itemValues.length != 5) return;
                    let dataItem = {};
                    dataItem.date = new Date(start.getTime() - parseInt(itemValues[0]) * 1000);
                    dataItem.seconds=parseInt(itemValues[0]);
                    dataItem.voltage = parseFloat(itemValues[1]) / 1000;
                    if (dataItem.voltage > max) max = dataItem.voltage;
                    if (dataItem.voltage < min)min = dataItem.voltage;
                    dataItem.x=idx;
                    dataItem.dummyValue=1;
                    dataItem.ctrl = itemValues[2];
                    dataItem.charger = itemValues[3];
                    dataItem.ctrlColor='grey';
                    switch(dataItem.ctrl){
                        case 'OnMinTime':
                            dataItem.ctrlColor='green';
                            break;
                        case 'OnExtended':
                            dataItem.ctrlColor='green';
                            break;
                        case 'TestOn':
                            dataItem.ctrlColor='green';
                            break;
                        case 'WaitFloat':
                            dataItem.ctrlColor='yellow';
                            break;
                    }
                    dataItem.onTime = parseInt(itemValues[4]);
                    values.push(dataItem);
                    idx++;
                };
            }
        }
        if (values.length > 0){
            //set x-axis labels
            for (let i=0;i<values.length;i++){
                values[i].xtick=formatDateToText(values[i].date,true)
            }

            storeData.values=values;
            storeData.min=min;
            storeData.max=max;
        }
        this.setState({data:storeData,running:false,error:undefined});
    }
    componentDidMount(){
        this.fetchData();
    }

    resizeChart(rect){
        if (this.state.width != rect.entry.width || this.state.height != rect.entry.height){
            this.setState({ width:rect.entry.width,height:rect.entry.height });
        }
    }

    render() {
        let title="History";
        let self=this;
        let Error=function(props){
            return (
                <div className={"commandError "+(props.className?props.className:"")}>
                    {props.data}
                </div>
            )
        };
        let Running=function(props){
          return(
              <div className="runningIndicator">
                  Loading...</div>
          );
        };

        let Chart = function (props) {
            return (
                <Measure
                    onResize={self.resizeChart}
                    children={(mp) =>
                  <div ref={mp.measureRef} className="chartContainer">
                    <ComposedChart barCategoryGap={-3}  height={self.state.height||DEFAULT_HEIGHT} width={self.state.width||DEFAULT_WIDTH} data={props.values}>
                        <YAxis label="V"/>
                        <XAxis dataKey="xtick"/>
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <Tooltip/>
                        <Line type="monotone" className="voltageCurve" dataKey="voltage" dot={false}/>
                        <Bar dataKey='dummyValue' >
                        {
                            props.values.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={props.values[index].ctrlColor}/>
                                ))
                        }
                        </Bar>
                    </ComposedChart>
                  </div>
              }/>

            )
        };
        return (
            <div className="view chartsView">
                <ToolBar >
                    <Button className="buttonBack" onClick={this.goBack}/>
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                </ToolBar>
                {this.state.running ?
                    <Running/>:
                    this.state.error?
                        <Error data={this.state.error}/>:
                        this.state.data.values?
                            <Chart values={this.state.data.values}/>
                            :null
                }
            </div>
        );
    }
    goBack(){
        this.props.history.goBack();
    }

}


export default ChartsView;
