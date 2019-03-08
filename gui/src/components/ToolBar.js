import React,{Component} from 'react';
import {AppBar} from 'react-toolbox/lib/app_bar';
import theme from '../style/theme/appBar.less';

class ToolBar extends Component {
    constructor(props){
        super(props);
        this.leftClick=this.leftClick.bind(this);
    }
    render() {
        let props={
            theme:theme,
            className:"toolbar  " +this.props.className
        };
        if (this.props.leftIcon){
            props.leftIcon=this.props.leftIcon;
            props.onLeftIconClick=this.leftClick;
        }
        let self=this;
        return (
            <AppBar {...props}>
                {React.Children.map(this.props.children,function(Item){
                    return React.cloneElement(Item ,{theme:self.props.theme||theme});
                })}
            </AppBar>
        );
    }
    leftClick(ev){
        if (this.props.leftClick){
            this.props.leftClick(ev);
        }
    }
}

export default ToolBar;