/**
 * Created by andreas on 25.11.16.
 */
import Store from './Store.js';
import React,{Component} from 'react';
import assign from 'object-assign';
/**
 * a simple item updater
 * that will register at a store with a key and will update its child based on the data
 * it retrieved from the store
 * all properties are forwarded to the children, mixed with the values fetched from the store
 * @param {*} Item the item (html or react class) that should be wrapped
 * @param {Store} store the store
 * @param {string||string[]} storeKey the key(s) to register at the store and fetch data
 *         if any of the returned items is not an object, the value will be assigned to a key with the
 *         name of the store key
 * @returns {*} the wrapped react class
 * @constructor
 */


let Updater=function(Item,store,storeKey) {
    let getStoreKeys=function(){
        if (storeKey === undefined) return ['update'];
        if (storeKey instanceof Array) return storeKey;
        else return [storeKey]
    };
    return class ItemUpdater extends Component {
        constructor(props){
            super(props);
            this.dataChanged=this.dataChanged.bind(this);
            let st={};
            if (! storeKey) st= {update:1};
            else {
                getStoreKeys().forEach(function (key) {
                    let v = store.getValue(key);
                    if (typeof(v) !== "object") {
                        v = {};
                        v[key] = store.getValue(key);
                    }
                    assign(st, v);
                });
            }
            this.state=st;
        }
        dataChanged(key,value) {
            if (! storeKey) {
                this.setState({update:1});
                return;
            }
            let v=value;
            if (typeof(value) !== "object"){
                v={};
                v[key]=value;
            }
            this.setState(v);
        }
        componentDidMount() {
            let self=this;
            getStoreKeys().forEach(function(key) {
                store.register(key, self.dataChanged);
            });
        }
        componentWillUnmount() {
            let self=this;
            getStoreKeys().forEach(function(key) {
                store.unregister(key, self.dataChanged);
            });
        }
        render () {
            let props = assign({}, this.props, this.state);
            return <Item {...props}/>
        }
    };
};

module.exports=Updater;