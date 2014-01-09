/**
 * Module dependencies.
 */
var express = require('express')
  , swig = require('swig')
  , path = require('path');

module.exports = function(app) {

  // App Configuration
  app.set('title', 'express-upload example');
  app.set('port', 3000);
  app.use(function(req, res, next) {
    res.locals = {
      project: {
        title: 'express-upload example',
        author: 'devcollectief',
        description: 'Express.js file upload middleware example application',
        authorurl: 'https://github.com/devcollectief',
        copyyear: 2014
      }
    };
    next();
  });

  // App Template Engine
  app.engine('view', swig.renderFile);
  app.set('views', __dirname + '/tapestry');
  app.set('view engine', 'view');
  app.set('view cache', false);
  swig.setDefaults({ cache: false });

  // MW | Connect Middleware
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.compress());
  app.use(express.methodOverride());
  app.use(express.urlencoded());
  app.use(express.json());
  
  // MW | Static Files
  app.use('/assets', express.static(path.join(path.normalize(__dirname + '/..'), 'public')));

  // MW | Express Router
  app.use(app.router);

  // MW | Error Handler
  app.use(require('express-error-with-sources')({contextSize: 3}));

};