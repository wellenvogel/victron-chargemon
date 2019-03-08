import React, { Component } from 'react';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';

import MainView from './MainView';
import SecondView from './SecondView';
class App extends Component {
  render() {
    return (
        <Router>
            <div className="main">
                <Route exact path="/" component={MainView}/>
                <Route path="/first" component={MainView}/>
                <Route path="/second/" component={SecondView}/>
            </div>
        </Router>
    );
  }
}

export default App;
