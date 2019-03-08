class Store {
    constructor(){
        this.data={};
        this.callbacks={};
        this.setValue=this.setValue.bind(this);
        this.getValue=this.getValue.bind(this);
        this.register=this.register.bind(this);
        this.unregister=this.unregister.bind(this);
    }
    setValue(key,value){
        this.data[key]=value;
        if (this.callbacks[key]){
            this.callbacks[keys].forEach(function(cb){
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
