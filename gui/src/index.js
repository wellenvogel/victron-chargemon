import "babel-polyfill";
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './style/App.less';
import 'whatwg-fetch';


document.addEventListener('DOMContentLoaded', function() {
    ReactDOM.render(<App />, document.getElementById('root'));
});
