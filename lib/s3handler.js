var formidable = require('formidable')
  , path = require('path')
  , util = require('util')
  , fs = require('fs')
  , uuid = require('node-uuid')
  , mkdirp = require('mkdirp')
  , async = require('async')
  , _ = require('underscore');

module.exports = function (middleware, options) {
  return function (req, res) {

    // Allow Override of AWS Settings
    if(_.isFunction(middleware.extendAwsOptions))
      options.aws = _.extend(options.aws, middleware.extendAwsOptions(req));

    var FileInfo = require('./partinfo')(options);

    var nocache = function () {
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Content-Disposition', 'inline; filename="files.json"');
    },
    formevent = function(location, data) {
      middleware.emit('formidable', { e: location, data: data});
    },
    fileext = function(filename) {
      var a = filename.split(".");
      if( a.length === 1 || ( a[0] === "" && a.length === 2 ) )
        return "";
      return a.pop().toLowerCase();
    },
    finish = function(err, fields, files) {

        // DEBUG
        formevent('finish', {fields: fields, files: files});

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
          , files = []
          , tmpFiles = [];

        // Initiate S3 Multipart Upload Stream
        var s3mp = require('./s3mpstream')
          , uploader = new s3mp({
              credentials: options.aws.secret,
              bucket: options.aws.bucket,
              region: options.aws.region
            });

        // Formidable Event Handler Chain
        form
          .on('field', function (name, value) {
            formevent('field', {name: name, value: value});
            fields.push([name, value]);
          })
          .on('aborted', function () {
            formevent('aborted', {});
            _.each(tmpFiles, function (file) {
              formevent('abort', file);
              fs.unlink(file);
            });
          })
          .on('error', function (err) {
            formevent('error', err);
            middleware.emit('error', err);
          })
          .on('progress', function (bytesReceived, bytesExpected) {
            if (bytesReceived > options.maxPostSize) {
              req.connection.destroy();
            }
          })
          .on('end', function() {
            formevent('end', null);
          });

        form.onPart = function(part) {
          // Formidable Handles Non File Parts
          if (!part.filename) {
              form.handlePart(part);
              return;
          } else {

            // DEBUG:
            formevent('form.onPart', part);

            var self = this
              , buff = Buffer(0)
              , concat = true
              , prfx = options.aws.keyPrefix
              , info = new FileInfo(part);

            // Information
            info.uuid = uuid.v4();
            uploader.config({mime : part.mime });
            
            /* 
              It takes time for the aws-sdk in the s3mpstream.js MultiPartUploader to get a handle on a Multipart UploadId.
              This catches the first batch of data otherwise lost on a pipe.
            */
            part.on('data', function(data) {
              self.pause();
              if(concat) buff = Buffer.concat([buff, data]);
            });

            /* Uploader Events
              error { e: location, data: err object || null }
              abort { data: awsobj }
              beforepush { final: boolean }
              afterpush { data: awsobj}
              complete { conmpletedata: awsobj, objinfodata: awsobj }
              chunk { streamedlength: integer }
            */
            uploader
              .on('beforepush', function(data) {
                middleware.emit('beforepush', { e: 'aws:beforepush', data: data });
              })
              .on('afterpush', function(data) {
                middleware.emit('afterpush', { e: 'aws:afterpush', data: data });
              })
              .on('complete', function(data) {
                async.parallel({
                 one: function(callback) {
                    middleware.emit('complete', { e: 'aws:complete', data: data });
                    callback(null, 1);
                  },
                  two: function(callback) {
                    info.size = data.info.ContentLength;
                    info.finished = new Date();
                    info.extension = fileext(info.name);
                    info.key = data.complete.Key;
                    info.bucket = data.complete.Bucket;
                    info.location = data.complete.Location;
                    files.push(info);
                    callback(null, 2);
                  }
                }, function(err, results) {
                  finish(null, fields, files);
                });
              })
              .on('error', function(data) {
                middleware.emit('error', { e: 'aws:error', data: data });
              })
              .on('abort', function(data) {
                middleware.emit('abort', { e: 'aws:abort', data: data });
              });

            // Initiate AWS S3 MultiPart Upload Write Stream Wrapper
            uploader.getStream(prfx + ((options.aws.uuid) ? info.uuid : info.name), function(err, ws) {
              if(err) {
                middleware.emit('error', { e: 'aws:getStream', data: null });
                req.connection.destroy();
              } else {
                concat = false;
                
                if(buff.length > 0) {
                  ws.write(buff,function() {
                    self.resume();
                  });
                }

                part
                  .on('data', function(data) {
                    self.pause();
                    ws.write(data, function() {
                      self.resume();
                    });
                  })
                  .on('end', function(name, value) {
                    formevent('part.end',  {name: name, value: value});
                    ws.end();
                  });

              }
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
