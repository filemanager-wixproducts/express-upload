var formidable = require('formidable')
  , path = require('path')
  , util = require('util')
  , fs = require('fs')
  , mkdirp = require('mkdirp')
  , _ = require('underscore');

module.exports = function (middleware, options) {
  return function (req, res) {

    var FileInfo = require('./fileinfo')(options);

    var nocache = function () {
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Content-Disposition', 'inline; filename="files.json"');
    },
    finish = function(err, fields, files) {

        // DEBUG
        console.log('FORMIDABLE:end {fields: %s, files: %s}', JSON.stringify(fields), JSON.stringify(files));

        // Content Type Negotiation
        res.writeHead(200, {
            'Content-Type': req.headers.accept
                .indexOf('application/json') !== -1 ?
                  'application/json' : 'text/plain'
        });

        // Return JSON Response
        res.end(JSON.stringify({fields: fields, files: files}));

    },
    form = function() {

        // Declarations
        var form = new formidable.IncomingForm()
          , fields = []
          , counter = 0
          , files = {}
          , tmpFiles = [];

        // Set Formidable Options
        form.uploadDir = options.dirs.tmp;

        //console.log(part);
        var s3mp = require('./s3mpstream')
          , uploader = new s3mp({
              credentials: {
                "accessKeyId": options.aws.key,
                "secretAccessKey": options.aws.secret,
                "region": "eu-west-1"
              },
              bucket: options.aws.bucket
            });

        // Formidable Event Handler Chain
        form
          .on('field', function (name, value) {
            console.log('FORMIDABLE:field {name: %s, value: %s}', name, value);
            fields.push([name, value]);
          })
          .on('aborted', function () {
            console.log('FORMIDABLE:aborted');
            _.each(tmpFiles, function (file) {
              middleware.emit('abort', files[path.basename(file.path)]);
              fs.unlink(file);
            });
          })
          .on('error', function (err) {
            console.log('FORMIDABLE:error: %s', JSON.stringify(err));
            middleware.emit('error', err);
          })
          .on('progress', function (bytesReceived, bytesExpected) {
            if (bytesReceived > options.maxPostSize) {
              req.connection.destroy();
            }
          });
          //.on('end', finish);

        form.onPart = function(part) {
          // Formidable Handles Non File Parts
          if (!part.filename) {
              form.handlePart(part);
              return;
          } else {

            // DEBUG:
            console.log('FORMIDABLE:form.onPart {type: %s part: %s}', typeof part, JSON.stringify(part));

            var self = this
              , buff = Buffer(0)
              , concat = true;
            
            /* 
              It takes time for the aws-sdk in the s3mpstream.js MultiPartUploader to get a handle on a Multipart UploadId.
              This catches the first batch of data otherwise lost on a pipe.
            */
            part.on('data', function(data) {
              self.pause();
              if(concat) buff = Buffer.concat([buff, data]);
            });

            /* Uploader Events
              error {err:object}
              abort {awsdata:object}
              beforepush {final:boolean}
              afterpush {awsdata:object}
              complete {awsdata:object}
              chunk {streamedlength:integer}
            */
            uploader
              .on('beforepush', function(data) {
                console.log('beforepush: %s', JSON.stringify(data));
              })
              .on('afterpush', function(data) {
                console.log('afterpush: %s', JSON.stringify(data));
              })
              .on('complete', function(data) {
                middleware.emit('upload complete', data);
                finish(null, files, fields);
              });

            // Initiate AWS S3 MultiPart Upload Write Stream Wrapper
            uploader.getStream(part.filename, function(err, ws) {
              if(err) return;
              concat = false;
              if(buff.length > 0) {
                ws.write(buff,function() {
                  self.resume();
                });
              }
              part.on('data', function(data) {
                self.pause();
                ws.write(data, function() {
                  self.resume();
                });
              })
              .on('end', function(name, value) {
                console.log('part.end: {name: %s, value: %s}', name, value);
                ws.end();
              });
            });


          }
        };

        // Parse Form
        form.parse(req);

    };

    // Set Access-Control-Allow Headers
    res.setHeader('Access-Control-Allow-Origin', options.accessControl.allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', options.accessControl.allowMethods);
    res.setHeader('Access-Control-Allow-Headers', options.accessControl.allowHeaders);

    // Parse Request Methods
    switch (req.method.toLowerCase()) {
      case 'post':

          // Set Cache Headers
          nocache();

          // Form Data Handler
          form();

        break;
      default:

        // HTTP Error 501 Method not implemented
        res.statusCode = 501;
        res.end();

    }

  };
};
