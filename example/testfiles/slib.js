var fs = require('fs')
  , mime = require('mime')
  , cred = require('./../credentials.json')
  , s3mp = require('./../../lib/s3mpstream.js');

//var file = fs.createReadStream('./fake.mp4');

var uploader = new s3mp({
  credentials: cred.aws.secret,
  bucket: cred.aws.bucket,
  region: cred.aws.region
  //mime: mime.lookup('./fake.mp4')
});

uploader.on('abort', function(data) {
  console.log('Multipart upload aborted with data: %s', JSON.stringify(data));
});

uploader.on('error', function(data) {
  console.log('Error with data: %s', JSON.stringify(data));
});

// uploader.getStream('fake.mp4', function(err, ws) {
//   if(err) return;
//   file.pipe(ws);
// });

// uploader.on('complete', function(err, data) {
//   console.log('upload finished');
// });

// uploader.on('chunk', function(data) {
//   console.log(data);
// });

// uploader.on('abort', function(data) {
//   console.log('Upload Aborted: %s', JSON.stringify(data));
// });

uploader.abortUploads(cred.aws.bucket);
