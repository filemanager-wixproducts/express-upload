var cred = require('./credentials.json')
  , uuid = require('node-uuid')
  , aws = require('aws-sdk')
  , fs = require('fs')
  , mime = require('mime')
  , _ = require('underscore');

// Define Bucket
cred = _.extend(cred, { /* bucket: 'different-bucket-name' */ });

aws.config.update(cred.aws);
var s3 = new aws.S3()
  , lerr = function(loc, err) {
    console.log('error occurred in: %s',loc);
    console.log(err);
  };

var s3actions = {
  abortUpload: function(Bucket, Key, UploadId) {
    s3.abortMultipartUpload({
      Bucket: Bucket,
      Key: Key,
      UploadId: UploadId
    }, function(err, data) {
      if(err) { lerr('abortUpload', err); return; }

      // SUCCESS Multipart Upload Aborted
      console.log('S3 Multipart Upload: %s Aborted.', JSON.stringify(data));

    });
  },
  listUploads: function(Bucket, cb) {
    s3.listMultipartUploads({Bucket: Bucket}, function(err, data) {
      if(err) { lerr('listMultipartUploads', err); cb(err); return; }
      
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
  },
  abortUploads: function(Bucket) {
    s3actions.listUploads(Bucket, function(err, data) {
      if(err) { lerr('s3actions.listUploads', err); return; }

      if(data.length > 0) {
        _.each(data, function(item) {
          s3actions.abortUpload(item.Bucket, item.Key, item.UploadId);
        });
      } else {
        console.log('No multipart uploads in progress');
      }
    });
  },
  uploadPart: function(params, chunk, partno, final, cb) {
    console.log('uploading part %s', partno);
    s3.uploadPart({
      Body: chunk,
      Bucket: params.Bucket,
      Key: params.Key,
      UploadId: params.UploadId,
      PartNumber: partno
    }, function (err, result) {
      if(err) { lerr('s3.uploadPart', err); return; }
      if(cb) cb(null, {
        size: chunk.length,
        ETag: result.ETag
      });
    });
  },
  completeUpload: function(params, PartMap) {
    s3.completeMultipartUpload({
      Bucket: params.Bucket,
      Key: params.Key,
      UploadId: params.UploadId,
      MultipartUpload: PartMap
    }, function(err, data) {
      if(err) { lerr('s3.completeMultipartUpload', err); return; }
      console.log('Upload Completed %s', JSON.stringify(data));
    });
  }
};

// Abort Uploads (Should be Parametrised)
var abort = true;
if(abort) {
  s3actions.abortUploads(cred.bucket);
} else {
  s3.headBucket({Bucket: cred.bucket}, function(err, data) {
    if(err) { lerr('headBucket', err); return; }

    // SUCCESS Bucket Exists
    console.log('S3 Bucket: %s exists. Data: %s', cred.bucket, JSON.stringify(data));

    // Initiate Multipart Upload  
    s3.createMultipartUpload({
      // ACL: 'bucket-owner-full-control',
      Bucket: cred.bucket,
      Key: 'testvalue.mp4',
      ContentType: mime.lookup('./testvalue.mp4')
    }, function(err, data) {
      if(err) { lerr('createMultipartUpload', err); return; }

      var file = fs.createReadStream('./fake.mp4')
        , maxchunksize = 5242880
        , streamedlength = 0
        , uploadedsize =0
        , bufflen = 0
        , pi = 1
        , partmap = []
        , curchunk = Buffer(0);

      var params = {
        Key: 'testvalue.mp4',
        UploadId: data.UploadId,
        Bucket: cred.bucket
      };

      var Writable = require('stream').Writable;
      var ws = Writable();
      ws.oend = ws.end;
      ws.end = function (chunk, encoding, callback) {
        ws.oend(chunk, encoding, callback);
        s3actions.uploadPart(params, curchunk, pi, true, function(err, data) {
          partmap.push({ ETag: data.ETag, PartNumber: pi});
          s3actions.completeUpload(params, { Parts: partmap });
        });
      };
      ws._write = function (chunk, enc, next) {

        curchunk = Buffer.concat([curchunk, chunk]);
        streamedlength += chunk.length;
        if(curchunk.length > maxchunksize) {
          s3actions.uploadPart(params, curchunk, pi, false, function(err, data) {
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

      file.pipe(ws);

      // Abort Created Upload
      //s3actions.abortUpload(data.Bucket, data.Key, data.UploadId);
    });
  });
}