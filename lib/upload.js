var events = require('events')
	, util = require('util')
	, _ = require('underscore');

var Upload = function() {
	events.EventEmitter.call(this);
	this.options = this.prepareOptions({});
};

util.inherits(Upload, events.EventEmitter);

Upload.prototype.prepareOptions =  function(options) {
	options = _.extend({
		dirs: {
			tmp: process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd(),
			upload: './upload'
		},
		maxPostSize: 11*1024*1024*1024,
		maxFileSize: 10*1024*1024*1024,
		minFileSize: 1,
    testmode: false,
    aws: {
      secret: {
        accessKeyId: '',
        secretAccessKey: '',
      },
      bucket: '',
      region: '',
      maxRetries: 15,
      uuid: true,
      keyPrefix: ''
    },
		acceptedFileTypes: /.+/i,
		accessControl: {
			allowOrigin: '*',
			allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
			allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
		},
		ssl: {
			key: '', //fs.readFileSync('/location/to/key.key'),
			cert: '' //fs.readFileSync('/location/to/certificate.crt')
		}
	}, options);

	return options;
};

Upload.prototype.handler = function (options) {
	return require('./handler.js')(this, this.prepareOptions(_.extend(this.options, options)));
};

Upload.prototype.s3handler = function (options) {
  return require('./s3handler.js')(this, this.prepareOptions(_.extend(this.options, options)));
};

Upload.prototype.extendAwsOptions = function (req) {
  return { poep: 'poep'};
};

module.exports = new Upload();
