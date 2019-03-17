import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';


class ManagedInput extends Component{
    constructor(props){
        super(props);
        this.state={value:props.value};
        this.inputChanged=this.inputChanged.bind(this);
        this.onKeyPress=this.onKeyPress.bind(this);
    }
    inputChanged(ev){
        this.setState({value:ev.target.value});
        if (this.props.onChange){
            this.props.onChange(ev.target.value);
        }
    }

    onKeyPress(key){
        if (this.props.onKeyPress){
            this.props.onKeyPress(key);
        }
    }
    componentWillReceiveProps(nextProps){
        if (nextProps.value != this.props.value){
            this.setState({value:nextProps.value});
        }
    }
    render(){
        return(
        <input
            className={"managedInput "+(this.props.className?this.props.className:"")}
            label={this.props.label?this.props.label:null}
            value={this.state.value}
            onChange={this.inputChanged}
            type={this.props.type}
            onKeyPress={this.onKeyPress}
            theme={this.props.theme?this.props.theme:undefined}
            >
        </input>
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
