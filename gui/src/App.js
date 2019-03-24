import React, { Component } from 'react';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';

import MainView from './MainView';
import SettingsView from './SettingsView';
import ChartsView from './ChartsView';
import ChartsViewServer from './ChartsViewServer'
class App extends Component {
  render() {
    return (
        <Router>
            <div className="main">
                <Route exact path="/" component={MainView}/>
                <Route path="/main" component={MainView}/>
                <Route path="/settings/" component={SettingsView}/>
                <Route path="/charts/" component={ChartsView}/>
                <Route path="/servercharts/" component={ChartsViewServer}/>
            </div>
        </Router>
    );
  }
}

export default App;
