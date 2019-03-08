import React, { Component } from 'react';
import {
    HashRouter as Router,
    Route
} from 'react-router-dom';

import ExampleView from './ExampleView';
import SecondView from './SecondView';
class App extends Component {
  render() {
    return (
        <Router>
            <div className="main">
                <Route exact path="/" component={ExampleView}/>
                <Route path="/first" component={ExampleView}/>
                <Route path="/second/" component={SecondView}/>
            </div>
        </Router>
    );
  }
}

export default App;
