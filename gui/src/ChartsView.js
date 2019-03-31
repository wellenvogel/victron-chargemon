import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import { RadioGroup, RadioButton } from 'react-toolbox/lib/radio';
import { Area, ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, ReferenceLine } from 'recharts';
import Measure from 'react-measure';
import Helper from './components/Helper.js';
import assign from 'object-assign';

const BASEURL='/control/command?cmd=';
const HISTORYURL=BASEURL+'history';
const SETTINGSURL=BASEURL+'set';

const DEFAULT_WIDTH=300;
const DEFAULT_HEIGHT=300;

const DISPLAY_6H=6*3600;
const DISPLAY_12H=12*3600;

const formatDateToText=Helper.formatDateToText;
const findFromDataArray=Helper.findFromDataArray;

class ChartsView extends Component {

    constructor(props){
        super(props);
        this.state={running:true,width:DEFAULT_WIDTH,height: DEFAULT_HEIGHT,runtime:0, displayInterval:0};
        this.goBack=this.goBack.bind(this);
        this.fetchData=this.fetchData.bind(this);
        this.setError=this.setError.bind(this);
        this.decodeData=this.decodeData.bind(this);
        this.resizeChart=this.resizeChart.bind(this);
        this.fetchSettings=this.fetchSettings.bind(this);
        this.handleDisplayInterval=this.handleDisplayInterval.bind(this);
        this.resizeTimer=0;

    }
    setError(err){
        this.setState({error:err,data:undefined,running:false});
    }
    fetchSettings(){
        let self=this;

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
            //settings are in mV, so we have to change this...
            self.setState({keepOnVoltage:keepOnVoltage/1000,offVoltage:offVoltage/1000})
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
                self.setError(jsonData.info||'unknown error');
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
        let start=new Date();
        for (let i in data){
            let item=data[i];
            if (item.definition.name == 'TE'){
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
                    dataItem=assign(dataItem,Helper.stateToValues(dataItem.ctrl));
                    values.push(dataItem);
                    idx++;
                };
            }
        }
        let runtime=0;
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
            runtime=start.getTime()/1000-values[0].date.getTime()/1000;
        }
        this.setState({data:storeData,running:false,error:undefined,runtime:runtime});
    }
    componentDidMount(){
        this.fetchData();
    }

    resizeChart(rect){
        console.log("resize trigger");
        window.clearTimeout(this.resizeTimer);
        this.resizeTimer=window.setTimeout(()=> {
            console.log("resize execute");
            if (this.state.width != rect.entry.width || this.state.height != rect.entry.height) {
                this.setState({width: rect.entry.width, height: rect.entry.height});
            }
        },200);
    }
    handleDisplayInterval(nval){
        this.setState({displayInterval:nval})
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

        const SelectTime=function(props){
            if (props.runtime < DISPLAY_6H) return null;
            return (
                <div className="displayInterval">
                    <RadioGroup className="displayIntervalInner" name='displayInterval' value={props.displayInterval}
                                onChange={self.handleDisplayInterval}>
                        <RadioButton label='all' value={0}/>
                        {(props.runtime > DISPLAY_12H) ? <RadioButton label='12h' value={DISPLAY_12H}/> : null}
                        {(props.runtime > DISPLAY_6H) ? <RadioButton label='6h' value={DISPLAY_6H}/> : null}
                    </RadioGroup>
                </div>
            );

        };

        const Chart = function (props) {
            return (
                <Measure
                    onResize={self.resizeChart}
                    children={(mp) =>
                  <div ref={mp.measureRef} className="chartContainer">
                    <ComposedChart barCategoryGap={-1}  height={self.state.height||DEFAULT_HEIGHT} width={self.state.width||DEFAULT_WIDTH} data={props.values}>
                        <YAxis label="V" domain={[5,15]}/>
                        <YAxis domain={[0,20]} allowDataOverflow={true} yAxisId="CTRL" hide={true}/>
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
                        <Area type="step" dataKey="ctrlOff" yAxisId="CTRL" className="OffArea" dot={false} isAnimationActive={false}/>
                        <Area type="step" dataKey="ctrlOn" yAxisId="CTRL" className="OnArea" dot={false} isAnimationActive={false}/>
                        <Area type="step" dataKey="ctrlPre" yAxisId="CTRL" className="PreArea" dot={false} isAnimationActive={false}/>
                        <Area type="step" dataKey="ctrlError" yAxisId="CTRL" className="ErrorArea" dot={false} isAnimationActive={false}/>
                        <Area type="step" dataKey="ctrlExtended" yAxisId="CTRL" className="ExtendedArea" dot={false} isAnimationActive={false}/>
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
                        <span className="value secondValue">({Helper.secondsToTime(props.runtime)})</span>
                    </div>
                    <div className="summaryOn">
                        <span className="label">On</span>
                        <span className="value">{Helper.secondsToTime(props.sum)}</span>
                    </div>
                    <div className="summaryPercent">
                        <span className="value">{props.percent?props.percent.toFixed(0):'0'}</span>
                        <span className="label">%</span>
                    </div>
                </div>
            );
        };
        let filteredValues=[];
        if (this.state.data && this.state.data.values) {
            let now = new Date();
            if (this.state.displayInterval == 0) {
                filteredValues = this.state.data.values;
            }
            else {
                let start = new Date();
                start.setTime(now.getTime() - this.state.displayInterval * 1000);
                for (let i in this.state.data.values) {
                    if (this.state.data.values[i].date >= start) {
                        filteredValues.push(this.state.data.values[i]);
                    }
                }
            }
        }
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
                            <SelectTime runtime={this.state.runtime} displayInterval={this.state.displayInterval}/>
                            <Chart values={filteredValues}/>
                            <Summary {...this.state.data} runtime={this.state.runtime}/>
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
