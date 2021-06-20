
const express = require('express');
const bodyParser = require('body-parser');
const consign = require('consign');
const config = require('config');

module.exports = () => {
    const app = express();

    // Setting variables for application
    app.set('port', process.env.PORT || config.get('server.port'));

    // Middlewares
    app.use(bodyParser.json());

    // Routes
    consign({cwd: 'api'})
        .then('data')
        .then('controllers')
        .then('routes')
        .into(app)

    return app;
};