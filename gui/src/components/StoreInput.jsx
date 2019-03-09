import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';
import Store from './Store.js';
import Input from 'react-toolbox/lib/input';


class StoreInput extends Component{
    constructor(props){
        super(props);
        this.state={value:Store.getValue(this.props.storeKey,"")};
        this.storeChanged=this.storeChanged.bind(this);
        this.inputChanged=this.inputChanged.bind(this);
    }
    componentDidMount(){
        Store.register(this.props.storeKey,this.storeChanged)
    }
    storeChanged(key,value){
        this.setState({value:value});
    }
    inputChanged(value){
        Store.setValue(this.props.storeKey,value);
    }
    componentWillUnmount(){
        Store.unregister(this.props.storeKey,this.storeChanged);
    }
    render(){
        return(
        <Input
            className={"storeInput "+(this.props.className?this.props.className:"")}
            label={this.props.label?this.props.label:null}
            value={this.state.value}
            onChange={this.inputChanged}
            type={this.props.type}
            >
        </Input>
        )
    }
}
StoreInput.propTypes={
    storeKey: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
};
export default StoreInput;
