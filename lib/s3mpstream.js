var events = require('events')
  , util = require('util')
  , aws = require('aws-sdk')
  , fs = require('fs')
  , _ = require('underscore');

// Constructor
var MultipartUploader = function(options) {
  events.EventEmitter.call(this);
  this.options = this.prepareOptions(options);
  aws.config.update(options.credentials);
  this.s3 = new aws.S3();
};

// Event Emitter Requirement
util.inherits(MultipartUploader, events.EventEmitter);

MultipartUploader.prototype.prepareOptions = function(options) {
  options = _.extend({
    credentials: {
      "accessKeyId": "",
      "secretAccessKey": "",
      "region": "",
      "maxRetries": 15
    },
    bucket: '',
    mime: ''
  }, options);
  return options;
};

MultipartUploader.prototype.handleError = function(location, err) {
  console.log('error occurred in: %s', location);
  console.log(err);
  this.emit('error', err);
};

MultipartUploader.prototype.abortUpload = function(Bucket, Key, UploadId) {
  var self = this;
  this.s3.abortMultipartUpload({
    Bucket: Bucket,
    Key: Key,
    UploadId: UploadId
  }, function(err, data) {
    if(err) { self.handleError('abortUpload', err); return; }

    // SUCCESS Multipart Upload Aborted
    self.emit('abort', data);

  });
};

MultipartUploader.prototype.listUploads = function(Bucket, cb) {
  var self = this;
  this.s3.listMultipartUploads({Bucket: Bucket}, function(err, data) {
    if(err) { self.handleError('listMultipartUploads', err); cb(err); return; }
    
    // Check Each Remaining Uploads
    var orphans = [];
    _.each(data.Uploads,function(el) {
      orphans.push({
        Bucket: Bucket,
        Key: el.Key,
        UploadId: el.UploadId
      });
    });

    // Return Remaining Uploads
    cb(null, orphans);

  });
};

MultipartUploader.prototype.abortUploads = function(Bucket) {
  var self = this;
  this.listUploads(Bucket, function(err, data) {
    if(err) { self.handleError('s3actions.listUploads', err); return; }

    if(data.length > 0) {
      _.each(data, function(item) {
        self.abortUpload(item.Bucket, item.Key, item.UploadId);
      });
    } else {
      console.log('Bucket %s, contains no active multipart uploads', Bucket);
    }
  });
};

MultipartUploader.prototype.uploadPart = function(params, chunk, partno, final, cb) {
  var self = this;

  // Emit beforepush
  this.emit('beforepush', final);

  // Call aws-sdk S3.uploadPart
  this.s3.uploadPart({
    Body: chunk,
    Bucket: params.Bucket,
    Key: params.Key,
    UploadId: params.UploadId,
    PartNumber: partno
  }, function (err, result) {
    if(err) { self.handleError('this.s3.uploadPart', err); return; }

    // Emit afterpush
    self.emit('afterpush', result);

    // Callback with AWS S3 Part Metadata
    if(cb) cb(null, {
      size: chunk.length,
      ETag: result.ETag
    });

  });

};

MultipartUploader.prototype.completeUpload = function(params, PartMap) {
  var self = this;

  // Call aws-sdk S3.completeMultipartUpload
  this.s3.completeMultipartUpload({
    Bucket: params.Bucket,
    Key: params.Key,
    UploadId: params.UploadId,
    MultipartUpload: PartMap
  }, function(err, data) {
    if(err) { self.handleError('this.s3.completeMultipartUpload', err); return; }

    // Emit AWS Multipart Upload Complete
    self.emit('complete', data);

  });
};

MultipartUploader.prototype.getStream = function(key, cb) {

  // State
  var maxchunksize = 5242880
    , streamedlength = 0
    , uploadedsize =0
    , bufflen = 0
    , pi = 1
    , partmap = []
    , curchunk = Buffer(0)
    , self = this;


  // Call aws-sdk S3.headBucket to check if bucket exists
  this.s3.headBucket({Bucket: self.options.bucket}, function(err, data) {
    if(err) {
      self.handleError('getStream:s3.headBucket', err);
      cb(err, null);
    } else {

      // Setup API Params
      var params = {
        Key: key,
        Bucket: self.options.bucket,
        ContentType: self.options.mime
      };

      // Call aws-sdk S3.createMultipartUpload to initiate multipart upload to get handle: UploadId
      self.s3.createMultipartUpload(params, function(err, data) {
        if(err) {
          self.handleError('getStream:s3.createMultipartUpload', err);
          cb(err, null);
        } else {

          // Add UploadId handle to params
          params = _.extend(params, { UploadId: data.UploadId });

          // Create Writeable Stream
          var Writable = require('stream').Writable;
          var ws = Writable();

          // Override End Method
          ws.oend = ws.end;
          ws.end = function (chunk, encoding, callback) {

            // Call Base Writable.end() function
            ws.oend(chunk, encoding, callback);

            // Flush buffer to AWS S3 and Complete upload on Callback
            self.uploadPart(params, curchunk, pi, true, function(err, data) {
              partmap.push({ ETag: data.ETag, PartNumber: pi});
              self.completeUpload(params, { Parts: partmap });
            });

          };

          // Override Write Methods
          ws._write = function (chunk, enc, next) {

            // Add chunk to buffer
            curchunk = Buffer.concat([curchunk, chunk]);
            streamedlength += chunk.length;
            
            // Emit chunk added event
            self.emit('chunk', streamedlength);

            // Are we above the AWS 5MB limit? Push : Continue
            if(curchunk.length > maxchunksize) {
              self.uploadPart(params, curchunk, pi, false, function(err, data) {
                uploadedsize += data.length;
                partmap.push({ ETag: data.ETag, PartNumber: pi});
                pi+=1;
                curchunk =  Buffer(0);
                next();
              });
            } else {
              next();
            }
          };

          ws.on('error', function(err) {
            console.log(err);
          });

          // Callback when stream ready for usage
          cb(null, ws);

        }
      });
    }
  });
};

module.exports = MultipartUploader;