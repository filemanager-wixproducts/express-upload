// Dependencies
var app = require('express')()
  , server = require('http').createServer(app);

// Initiate Express & Config
require('./app/config')(app);

// Initiate Routes
require('./app/router')(app);

// Start Server
server.listen(app.get('port'), function() {
  console.log('Environment Variable: %s', process.env.NODE_ENV);
  console.log('Server Listening @ Port: ' + app.get('port'));
});