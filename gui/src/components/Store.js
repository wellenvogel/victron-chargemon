class Store {
    constructor(){
        this.data={};
        this.callbacks={};
        this.setValue=this.setValue.bind(this);
        this.getValue=this.getValue.bind(this);
        this.register=this.register.bind(this);
        this.unregister=this.unregister.bind(this);
    }
    compare(oldval,newval){
        if (typeof(newval) !== typeof (oldval)) return false;
        if (typeof (newval) === 'function') return true;
        if (oldval === null && newval !== null) return false;
        if (newval === null && oldval !== null) return false;
        if (newval === null && oldval === null) return true;
        if (typeof(newval) === 'object'){
            if (Object.keys(newval).length != Object.keys(oldval).length) return false;
            for (let k in oldval){
                if (! this.compare(oldval[k],newval[k])) return false;
            }
            return true;
        }
        else{
            return (newval == oldval);
        }
    }
    setValue(key,value,onlyUpdate){
        if (onlyUpdate && this.compare(this.data[key],value)) return;
        this.data[key]=value;
        if (this.callbacks[key]){
            this.callbacks[key].forEach(function(cb){
                cb(key,value);
            })
        }
    }
    getValue(key,def){
        if (this.data[key] === undefined) return def;
        return this.data[key];
    }
    deleteValue(key){
        delete this.data[key];
        if (this.callbacks[key]){
            this.callbacks[keys].forEach(function(cb){
                cb(key,undefined);
            })
        }
    }

    /**
     *
     * @param key
     * @param callback {function(key,value)} the callback to be invoked when the key changes
     */
    register(key,callback){
        if (typeof (callback) !== 'function') throw Error("callback must be a function");
        if (this.callbacks[key] === undefined) this.callbacks[key]=[];
        else if (this.findCallback(key,callback) >= 0) return;
        this.callbacks[key].push(callback);

    }

    /**
     * find an existing callback
     * @param key
     * @param callback
     * @returns {number}
     * @private
     */
    findCallback(key,callback){
        let idx=-1;
        let i=0;
        for (i in this.callbacks[key]){
            if (this.callbacks[key] === callback){
                idx=i;
                break;
            }
        }
        return idx;
    }
    unregister(key,callback){
        let idx=this.findCallback(key,callback);
        if (idx <0) return;
        this.callbacks[key].splice(idx,1);
    }
}

let store=new Store();

export default store;
