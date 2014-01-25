var _ = require('underscore')
  , upload = require('express-upload'); //./../../

module.exports = function(app) {

  app.get('/', function(req, res) {
    res.redirect('/upload');
  });

  // ROUTE: GET /upload
  app.get('/upload', function(req, res) {
    res.render('upload', _.extend({ title: 'Upload' }, res.locals));
  });

  // ROUTE: ALL /upload 
  app.use('/upload', upload.handler({
    aws: require('./../credentials.json'),
    streams3: true
  }));

};