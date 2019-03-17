import React,{Component} from 'react';
import assign from 'object-assign';
import PropTypes from 'prop-types';
import Dropdown from 'react-toolbox/lib/dropdown';


class ManagedDropdown extends Component{
    constructor(props){
        super(props);
        this.state={value:props.value};
        this.inputChanged=this.inputChanged.bind(this);
    }
    inputChanged(value){
        this.setState({value:value});
        if (this.props.onChange){
            this.props.onChange(value);
        }
        return false;
    }
    render(){
        return(
        <Dropdown
            auto
            className={"managedInput "+(this.props.className?this.props.className:"")}
            label={this.props.label?this.props.label:null}
            value={this.state.value}
            onChange={this.inputChanged}
            source={this.props.source}
            theme={this.props.theme?this.props.theme:undefined}
            >
        </Dropdown>
        )
    }
}
ManagedDropdown.propTypes={
    onChange: PropTypes.func.isRequired,
    source: PropTypes.array.isRequired,
    theme: PropTypes.object
};
export default ManagedDropdown;
