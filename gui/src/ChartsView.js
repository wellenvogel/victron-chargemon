import React, { Component } from 'react';
import ToolBar from './components/ToolBar';
import Button from 'react-toolbox/lib/button';
import {XYPlot,LineSeries,XAxis,YAxis} from 'react-vis';
import Measure from 'react-measure';

const BASEURL='/control/command?cmd=history';

const DEFAULT_WIDTH=300;
const DEFAULT_HEIGHT=300;

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
                    dataItem.y=dataItem.voltage;
                    dataItem.x=idx;
                    dataItem.ctrl = itemValues[2];
                    dataItem.charger = itemValues[3];
                    dataItem.onTime = parseInt(itemValues[4]);
                    values.push(dataItem);
                    idx++;
                };
            }
        }
        if (values.length > 0){
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
                    <XYPlot height={self.state.height||DEFAULT_HEIGHT} width={self.state.width||DEFAULT_WIDTH}>
                        <YAxis tickValues={[6,7,8,9,10,11,12,13,14]} title="V" style={{title:{transform:'rotate(90)'}
                        }}/>
                        <XAxis/>
                        <LineSeries className="voltageCurve" data={props.values} />
                    </XYPlot>
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
