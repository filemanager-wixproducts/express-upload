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
    // aws: {
    //   key : 'your key',
    //   secret: 'your secret',
    //   bucket: 'your bucket'
    // },
    streams3: false,
		acceptedFileTypes: /.+/i,
		accessControl: {
			allowOrigin: '*',
			allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
			allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
		},
		/* Uncomment and edit this section to provide the service via HTTPS:
		ssl: {
			key: fs.readFileSync('/Applications/XAMPP/etc/ssl.key/server.key'),
			cert: fs.readFileSync('/Applications/XAMPP/etc/ssl.crt/server.crt')
		}
		*/
	}, options);

	return options;
};

Upload.prototype.handler = function (options) {
	return require('./handler.js')(this, this.prepareOptions(_.extend(this.options, options)));
};

Upload.prototype.s3handler = function (options) {
  return require('./s3handler.js')(this, this.prepareOptions(_.extend(this.options, options)));
};

module.exports = new Upload();
