const Helper={
    formatNumber:function(num,digits){
        let rt=num.toFixed(0);
        while(rt.length < digits){
            rt="0"+rt;
        }
        return rt;
    },
    formatDate:function(date,withDay){
        let rt={time:Helper.formatNumber(date.getHours(),2)+":"+Helper.formatNumber(date.getMinutes(),2)};
        if (withDay){
            rt.day=Helper.formatNumber(date.getMonth()+1,2)+"/"+Helper.formatNumber(date.getDate(),2);
        }
        return rt;
    },
    formatDateToText:function(date,withDay){
        let dv=Helper.formatDate(date,withDay);
        return dv.day+" "+dv.time;
    },
    formatDateDay:function(date){
        return Helper.formatNumber(date.getMonth()+1,2)+"/"+Helper.formatNumber(date.getDate(),2);
    },
    findFromDataArray:function(data,name,returnValue){
        for (let i in data){
            if (data[i].definition && data[i].definition.name == name){
                if (returnValue) return data[i].value;
                return data[i];
            }
        }
    },
    secondsToTime:function(seconds){
        let hours=Math.floor(seconds/3600);
        seconds=seconds-hours*3600;
        let minutes=Math.floor(seconds/60);
        seconds=seconds-60*minutes;
        return Helper.formatNumber(hours,2)+":"+Helper.formatNumber(minutes,2)+":"+Helper.formatNumber(seconds,2);
    },
    stateToValues: function(state) {
        let rt = {
            ctrlOn: 0,
            ctrlExtended:0,
            ctrlOff: 1,
            ctrlPre: 0,
            ctrlError: 0
        };
        const setState = (name)=> {
            for (let k in rt) {
                rt[k] = 0;
            }
            rt[name] = 1;
        };
        switch (state) {
            case 'OnMinTime':
                setState('ctrlOn');
                break;
            case 'OnExtended':
                setState('ctrlExtended');
                break;
            case 'TestOn':
                setState('ctrlOn');
                break;
            case 'Fail':
                setState('ctrlError');
                break;
            case 'WaitFloat':
                setState('ctrlPre');
                break;
        }
        return rt;
    }
};

export default Helper;