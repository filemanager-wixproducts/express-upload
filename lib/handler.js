var formidable = require('formidable')
	, path = require('path')
	, util = require('util')
	, fs = require('fs')
	, mkdirp = require('mkdirp')
  , knox = require('knox')
  , mpu = require('knox-mpu')
  , stream = require('stream')
  , StringDecoder = require('string_decoder').StringDecoder
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



				
				// Formidable Event Handler Chain
				form
					.on('fileBegin', function (field, file) {

						// Store Information
						tmpFiles.push(file.path);
						var fileInfo = new FileInfo(file);
						files[path.basename(file.path)] = fileInfo;

						// Emit begin Message
						middleware.emit('begin', fileInfo);

					})
					.on('field', function (name, value) {
						console.log('field pushed %s:%s',name,value);
            fields.push([name, value]);
					})
					.on('file', function (name, file) {
					
						//TODO: Check Asynchronous Functionality Conversion

						// Get Respective File Information
						var fileInfo = files[path.basename(file.path)];

						// Check Uploaded File Exists
						if(fs.existsSync(file.path)) {

							// Check Uploaded File Validates
							if(fileInfo.validate()) {

								// Check Upload Dir
								if (!fs.existsSync(options.dirs.upload + '/'))
                  mkdirp.sync(options.dirs.upload + '/');

                // Move file by renaming if no error, copy file by stream & unlink otherwise
                fs.rename(file.path, options.dirs.upload + '/' + fileInfo.name, function (err) {
                  if (!err) {
                    console.log('renamed upload to upload dir: ', file.path);
                  } else {
                      
										// Define Streams
										var is = fs.createReadStream(file.path)
											,	os = fs.createWriteStream(options.dirs.upload + '/' + fileInfo.name);

										// Move Done Callback
										is.on('end', function (err) {
											if (!err) fs.unlinkSync(file.path);
											console.log('stream & unlink finish: %d', file.path);
										});

										// Initiate Pipe
										is.pipe(os);

									}
                });

							}

						}

					})
					.on('aborted', function () {
            _.each(tmpFiles, function (file) {
							middleware.emit('abort', files[path.basename(file.path)]);
							fs.unlink(file);
            });
					})
					.on('error', function (err) {
						middleware.emit('error', err);
					})
					.on('progress', function (bytesReceived, bytesExpected) {
						if (bytesReceived > options.maxPostSize) {
							req.connection.destroy();
						}
					})
					.on('end', finish);


      var s3c = knox.createClient({
                key: options.aws.key
              , secret: options.aws.secret
              , bucket: options.aws.bucket
            });
      console.log(s3c);

        form.onPart = function(part) {
          
          var self = this
            , decoder = new StringDecoder('utf8')
            , Writable = require('stream').Writable
            , ws = Writable();

          // Formidable Handles Non File Parts
          if (!part.filename) {
              form.handlePart(part);
              return;
          } else {

            var upload = new mpu({
                client: s3c,
                objectName: 'destination.mp4', // Amazon S3 object name
                stream: part
              },
              // Callback handler
              function(err, body) {
                if(err) console.log(err);
                if(body) console.log(body);
              }
            ).on('initiated', function(uid) {
              console.log('uid: %s', uid);
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
