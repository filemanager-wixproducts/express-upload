express-upload
==============

express.js file upload middleware

### Description
This is an express middleware module to handle file uploads. It uses the popular [node-formidable](https://github.com/felixge/node-formidable) to parse the incoming http and works very well with [jquery-file-upload](https://github.com/blueimp/jQuery-File-Upload).

### Basic Usage
In order to process multipart file uploads that are send by an html form to for example `/upload` just add the following middleware element to express.

	app.use('/upload', upload.handler({ /* option overrides go here */ }));

And ofcourse declare upload as such:

	var upload = require('express-upload');

It will be instantiated with the following default options (which are overridable as shown above):

	{
		dirs: {
			tmp: process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd(),
			upload: './upload'
		},
		maxPostSize: 11*1024*1024*1024,
		maxFileSize: 10*1024*1024*1024,
		minFileSize: 1,
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
	}

### Example
See the example in `/example` in order to get a better idea on how to integrate this with your express setup.