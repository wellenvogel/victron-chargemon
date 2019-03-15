import React, { Component } from 'react';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';

import MainView from './MainView';
import SettingsView from './SettingsView';
import ChartsView from './ChartsView'
class App extends Component {
  render() {
    return (
        <Router>
            <div className="main">
                <Route exact path="/" component={MainView}/>
                <Route path="/main" component={MainView}/>
                <Route path="/settings/" component={SettingsView}/>
                <Route path="/charts/" component={ChartsView}/>
            </div>
        </Router>
    );
  }
}

export default App;
