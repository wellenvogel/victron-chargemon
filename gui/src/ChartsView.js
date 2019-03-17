import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import { ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, ReferenceLine } from 'recharts';
import Measure from 'react-measure';

const BASEURL='/control/command?cmd=';
const HISTORYURL=BASEURL+'history';
const SETTINGSURL=BASEURL+'set';

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

const findFromDataArray=function(data,name,returnValue){
  for (let i in data){
      if (data[i].definition && data[i].definition.name == name){
          if (returnValue) return data[i].value;
          return data[i];
      }
  }
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
        this.fetchSettings=this.fetchSettings.bind(this);

    }
    setError(err){
        this.setState({error:err,data:undefined,running:false});
    }
    fetchSettings(){
        let self=this;
        this.setState({running:true});

        fetch(SETTINGSURL,{
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
            let keepOnVoltage=findFromDataArray(jsonData.data,'KeepOnVoltage',true);
            let offVoltage=findFromDataArray(jsonData.data,'OffVoltage',true);
            self.setState({keepOnVoltage:keepOnVoltage,offVoltage:offVoltage})
        })

    }
    fetchData(){
        this.fetchSettings();
        let self=this;
        this.setState({running:true});

        fetch(HISTORYURL,{
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
        let storeData = {};
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
                    dataItem.index=idx;
                    dataItem.controlState=5.5; //must fit to the domain of the Y axis
                    dataItem.ctrl = itemValues[2];
                    dataItem.charger = itemValues[3];
                    if (dataItem.charger == 'Error') dataItem.ctrl='Fail';
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
            let sum=findFromDataArray(data,'SU',true);
            if (sum){
                storeData.sum=sum;
                let length=findFromDataArray(data,'TS',true);
                if (length) storeData.percent=(sum*100)/length;
            }
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
        let title="Chart";
        let self=this;
        let Error=function(props){
            return (
                <div className={"commandError "+(props.className?props.className:"")}>
                    {props.data}
                </div>
            )
        };
        const Running=function(props){
          return(
              <div className="runningIndicator">
                  Loading...</div>
          );
        };
        const CustomTooltip = ({ active, payload, label }) => {
            if (active) {
                let data=payload[0].payload;
                return (
                    <div className="custom-tooltip">
                        <p className="label">{label}</p>
                        <p className="value">{`Voltage: ${data.voltage} V`}</p>
                        <p className="value">{`State: ${data.ctrl}`}</p>
                        <p className="value">{`Charger: ${data.charger}`}</p>
                    </div>
                );
            }
            return null;
        };

        const Chart = function (props) {
            return (
                <Measure
                    onResize={self.resizeChart}
                    children={(mp) =>
                  <div ref={mp.measureRef} className="chartContainer">
                    <ComposedChart barCategoryGap={-1}  height={self.state.height||DEFAULT_HEIGHT} width={self.state.width||DEFAULT_WIDTH} data={props.values}>
                        <YAxis label="V" domain={[5,15]}/>
                        <XAxis dataKey="xtick"/>
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <Tooltip content={<CustomTooltip/>}/>
                        {self.state.keepOnVoltage?
                            <ReferenceLine y={self.state.keepOnVoltage}
                                className="keepOnVoltage"
                                label={{value:"Keep: "+self.state.keepOnVoltage+" V",position:'top'}}
                                strokeDasharray="3 3"
                                />:null
                        }
                        {self.state.offVoltage?
                            <ReferenceLine y={self.state.offVoltage}
                                className="offVoltage"
                                label={{value:"Off: "+self.state.offVoltage+" V",position:'bottom'}}
                                />:null
                        }
                        <Line type="monotone" className="voltageCurve" dataKey="voltage" dot={false}/>
                        <Bar dataKey='controlState' >
                        {
                            props.values.map((entry, index) => (
                                <Cell key={`cell-${index}`} className={props.values[index].ctrl}/>
                                ))
                        }
                        </Bar>
                    </ComposedChart>
                  </div>
              }/>

            )
        };
        let Summary= function(props){
            if (! props.sum) return null;
            return (
                <div className="summary">
                    <div className="summaryFrom">
                        <span className="label">Since</span>
                        <span className="value">{props.values[0]?formatDateToText(props.values[0].date,true):''}</span>
                    </div>
                    <div className="summaryOn">
                        <span className="label">On</span>
                        <span className="value">{props.sum+"s"}</span>
                    </div>
                    <div className="summaryPercent">
                        <span className="value">{props.percent?props.percent.toFixed(0):''}</span>
                        <span className="label">%</span>
                    </div>
                </div>
            );
        };
        return (
            <div className="view chartsView">
                <ToolBar >
                    <Button className="buttonBack" onClick={this.goBack} neutral={false}/>
                    <span className="toolbar-label">{title}</span>
                    <span className="spacer"/>
                    <Button className="buttonRefresh" onClick={this.fetchData} neutral={false}/>
                </ToolBar>
                {this.state.running ?
                    <Running/>:
                    this.state.error?
                        <Error data={this.state.error}/>:
                        this.state.data.values?
                            <div className="chartWrapper">
                            <Chart values={this.state.data.values}/>
                            <Summary {...this.state.data}/>
                            </div>
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
