import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';
import Input from 'react-toolbox/lib/input';


class ManagedInput extends Component{
    constructor(props){
        super(props);
        this.state={value:props.value};
        this.inputChanged=this.inputChanged.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
    }
    inputChanged(value){
        this.setState({value:value});
        if (this.props.onChange){
            this.props.onChange(value);
        }
    }
    onKeyPress(key){
        if (this.props.onKeyPress){
            this.props.onKeyPress(key);
        }
    }
    render(){
        return(
        <Input
            className={"storeInput "+(this.props.className?this.props.className:"")}
            label={this.props.label?this.props.label:null}
            value={this.state.value}
            onChange={this.inputChanged}
            type={this.props.type}
            onKeyPress={this.onKeyPress}
            theme={this.props.theme?this.props.theme:undefined}
            >
        </Input>
        )
    }
}
ManagedInput.propTypes={
    onChange: PropTypes.func.isRequired,
    onKeyPress: PropTypes.func,
    type: PropTypes.string.isRequired,
    theme: PropTypes.object
};
export default ManagedInput;
