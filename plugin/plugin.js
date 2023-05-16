
const fmt=(val,fix,fract)=>{
    return avnav.api.formatter.formatDecimal(val,fix,fract);
}

const chargerWidget={
    name: 'chargerWidget',
    storeKeys:{
        batteryVoltage: 'nav.gps.transducers.BatteryVolt',
        chargeCurrent: 'nav.gps.transducers.ChargeCurrent',
        panelVoltage: 'nav.gps.transducers.PanelVolt',
        panelPower: 'nav.gps.transducers.PanelPower'
    },
    renderHtml: function(props){
        let batV=fmt(props.batteryVoltage,2,2);
        let panelV=fmt(props.panelVoltage,3,2);
        let panelP=fmt(props.panelPower,3,0);
        let curr=fmt(props.chargeCurrent,3,2);
        rt=`<div class="sub"><div class="widgetData">${batV}</div><div class="infoLeft">BatteryVoltage</div><div class="infoRight">V</div></div>`;
        rt+=`<div class="sub"><div class="widgetData">${panelV}</div><div class="infoLeft">PanelVoltage</div><div class="infoRight">V</div></div>`;
        rt+=`<div class="sub"><div class="widgetData">${panelP}</div><div class="infoLeft">PanelPower</div><div class="infoRight">W</div></div>`;
        rt+=`<div class="sub"><div class="widgetData">${curr}</div><div class="infoLeft">ChargeCurrent</div><div class="infoRight">A</div></div>`;
        return rt;
    }

};

const chargerWidgetParam={
    caption:false,
    unit: false,
    formatter: false
};
avnav.api.registerWidget(chargerWidget,chargerWidgetParam)