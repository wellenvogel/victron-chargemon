import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import { RadioGroup, RadioButton } from 'react-toolbox/lib/radio';
import { ComposedChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, ReferenceLine } from 'recharts';
import Measure from 'react-measure';
import Helper from './components/Helper.js';

//align with CSS/LESS
const VOLTAGE_COLOR='#0397ff';
const VPV_COLOR='#ffb01f';
const ICOLOR='#08cd59';

const BASEURL='/control/';
const HISTORYURL=BASEURL+'history';
const DAYSURL=BASEURL+'days';
const SETTINGSURL=BASEURL+'command?cmd=set';

const DEFAULT_WIDTH=300;
const DEFAULT_HEIGHT=300;

const DISPLAY_6H=6*3600;
const DISPLAY_12H=12*3600;

const formatDateToText=Helper.formatDateToText;
const findFromDataArray=Helper.findFromDataArray;

class ChartsViewServer extends Component {

    constructor(props){
        super(props);
        this.state={
            running:true,
            width:DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            runtime:0,
            displayInterval:0,
            historyDays:[0],
            currentDay:0
        };
        this.goBack=this.goBack.bind(this);
        this.fetchData=this.fetchData.bind(this);
        this.setError=this.setError.bind(this);
        this.decodeData=this.decodeData.bind(this);
        this.resizeChart=this.resizeChart.bind(this);
        this.fetchSettings=this.fetchSettings.bind(this);
        this.handleDisplayInterval=this.handleDisplayInterval.bind(this);
        this.changeDay=this.changeDay.bind(this);

    }
    setError(err){
        this.setState({error:err,data:undefined,running:false});
    }
    fetchDays(){
        let self=this;

        fetch(DAYSURL,{
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
            self.setState({historyDays:jsonData.data})
        })

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
    fetchData(day){
        this.fetchSettings();
        this.fetchDays();
        let self=this;
        this.setState({running:true});

        fetch(HISTORYURL+"?day="+(day||0),{
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
            self.decodeData(jsonData.data.values);
        })

    }
    decodeData(data) {
        let storeData = {};
        let values=[];
        for (let i in data) {
            let item = data[i];
            let dataItem = {};
            for (let k in item){
                if (k == 'date'){
                    dataItem[k]=new Date(item[k]);
                }
                else {
                    dataItem[k] = (item[k] == '##') ? 0 : item[k];
                }
            }
            dataItem.controlState = 5.5; //must fit to the domain of the Y axis
            dataItem.ctrl = item['CState'];
            if (dataItem.Connection == 'FAIL') dataItem.ctrl = 'Fail';
            values.push(dataItem);
        }
        let runtime=0;
        //TODO: set runtime
        if (values.length > 0){
            //set x-axis labels
            for (let i=0;i<values.length;i++){
                values[i].xtick=formatDateToText(values[i].date,true)
            }

            storeData.values=values;
        }
        this.setState({data:storeData,running:false,error:undefined,runtime:runtime});

    }
    componentDidMount(){
        this.fetchData();
    }

    resizeChart(rect){
        if (this.state.width != rect.entry.width || this.state.height != rect.entry.height){
            this.setState({ width:rect.entry.width,height:rect.entry.height });
        }
    }
    handleDisplayInterval(nval){
        this.setState({displayInterval:nval})
    }

    render() {
        let title="Server";
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
                        <p className="value">{`Voltage: ${data.V} V`}</p>
                        <p className="value">{`Power: ${data.PPV}W`}</p>
                        <p className="value">{`State: ${data.ctrl}`}</p>
                        <p className="value">{`Charger: ${data.CS}`}</p>
                        <p className="value">{`Current: ${data.I}`}</p>
                    </div>
                );
            }
            return null;
        };

        const SelectTime=function(props){
            let dayIdx=-1;
            for (let i=0;i<props.historyDays.length;i++){
                if (props.historyDays[i] == props.currentDay){
                    dayIdx=i;
                    break;
                }
            }
            let displayDate=new Date();
            if (props.currentDay != 0){
                displayDate=new Date(displayDate.getTime()+props.currentDay*24*3600*1000);
            }
            return (
                <div className="displayInterval">
                    <Button onClick={props.onPreviousDay} className="previousDay " disabled={(dayIdx <=0)}/>
                    <span className="currentDate">{Helper.formatDateDay(displayDate)}</span>
                    {props.runtime >= DISPLAY_6H ?
                        <RadioGroup className="displayIntervalInner" name='displayInterval'
                                    value={props.displayInterval}
                                    onChange={self.handleDisplayInterval}>
                            <RadioButton label='all' value={0}/>
                            {(props.runtime > DISPLAY_12H) ? <RadioButton label='12h' value={DISPLAY_12H}/> : null}
                            {(props.runtime > DISPLAY_6H) ? <RadioButton label='6h' value={DISPLAY_6H}/> : null}
                        </RadioGroup>
                        : null
                    }
                    <Button onClick={props.onNextDay}
                            className="nextDay" disabled={(dayIdx < 0 || dayIdx >=(props.historyDays.length-1))}/>

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
                        <YAxis label="V" domain={[5,15]} allowDataOverflow={true} stroke={VOLTAGE_COLOR} width={30}/>
                        <YAxis label="I" domain={[0,20]} allowDataOverflow={true} yAxisId="I" stroke={ICOLOR} width={30}/>
                        <YAxis label="P" domain={[0,300]} allowDataOverflow={true} yAxisId="P" stroke={VPV_COLOR} width={30}/>
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
                        <Line type="monotone" className="voltageCurve" dataKey="V" stroke={VOLTAGE_COLOR} dot={false} isAnimationActive={false}/>
                        <Line type="monotone" className="vpvCurve" dataKey="PPV" yAxisId="P" stroke={VPV_COLOR} dot={false} isAnimationActive={false}/>
                        <Line type="monotone" className="iCurve" dataKey="I" yAxisId="I" stroke={ICOLOR} dot={false} isAnimationActive={false}/>
                        <Bar dataKey='controlState' isAnimationActive={false}>
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
        //TODO: Summary...
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
                    <Button className="buttonRefresh" onClick={()=>this.fetchData(this.state.currentDay)} neutral={false}/>
                </ToolBar>
                {this.state.running ?
                    <Running/>:
                    this.state.error?
                        <Error data={this.state.error}/>:
                        this.state.data.values?
                            <div className="chartWrapper">
                            <SelectTime
                                runtime={this.state.runtime}
                                displayInterval={this.state.displayInterval}
                                currentDay={this.state.currentDay}
                                historyDays={this.state.historyDays}
                                onPreviousDay={()=> self.changeDay(-1)}
                                onNextDay={()=>self.changeDay(1)}
                                />
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
    changeDay(num){
        let dayIdx=-1;
        for (let i=0;i<this.state.historyDays.length;i++){
            if (this.state.historyDays[i] == this.state.currentDay){
                dayIdx=i;
                break;
            }
        }
        if (dayIdx < 0) return;
        dayIdx+=num;
        if (dayIdx < 0) dayIdx=0;
        if (dayIdx >= this.state.historyDays.size) dayIdx=this.state.historyDays.length-1;
        this.setState({currentDay:this.state.historyDays[dayIdx]});
        this.fetchData(this.state.historyDays[dayIdx])
    }

}


export default ChartsViewServer;
