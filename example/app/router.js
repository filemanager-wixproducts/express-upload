var _ = require('underscore')
  , upload = require('express-upload');

module.exports = function(app) {

  app.get('/', function(req, res) {
    res.redirect('/upload');
  });

  // ROUTE: GET /upload
  app.get('/upload', function(req, res) {
    res.render('upload', _.extend({ title: 'Server Upload', uploadpath: '/upload' }, res.locals));
  });

  // ROUTE: GET /s3upload
  app.get('/s3upload', function(req, res) {
    res.render('upload', _.extend({ title: 'S3 Upload', uploadpath: '/s3upload' }, res.locals));
  });


  // ROUTE: ALL /upload 
  app.use('/upload', upload.handler({}));

    // ROUTE: ALL /upload 
  app.use('/s3upload', upload.s3handler({
    aws: require('./../credentials.json'),
    streams3: true
  }));

};