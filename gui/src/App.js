import React, { Component } from 'react';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';

import MainView from './MainView';
import SettingsView from './SettingsView';
class App extends Component {
  render() {
    return (
        <Router>
            <div className="main">
                <Route exact path="/" component={MainView}/>
                <Route path="/main" component={MainView}/>
                <Route path="/settings/" component={SettingsView}/>
            </div>
        </Router>
    );
  }
}

export default App;
