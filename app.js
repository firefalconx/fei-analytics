// Dependencies for app
var express = require('express'),
    favicon = require('serve-favicon'),
    path = require('path');

var indexRouter = require('./routes');

// create instance of express
var app = express();
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));


// define middleware
app.use(express.static(path.join(__dirname, './public')));

// routes
app.use('/', indexRouter);




// error hndlers
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.end(JSON.stringify({
    message: err.message,
    error: {}
  }));
});

module.exports = app;
