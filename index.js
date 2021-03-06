#!/usr/bin/env node

var app = require('./app');

//Set app to run on port #3000
app.set('port', process.env.PORT || 3050);

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});
