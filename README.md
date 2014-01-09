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
The application provided is a little more elaborate than the bare minimum but shows the workings quite well (I think).

To run the example please first run `bower install` & `npm install` in the root directory of the example. After bower & npm dependencies are finished installing, the application can be initiated with `node app.js` and will run at [localhost:3000](http://localhost:3000).

### Todo
Below are some items to be done before publicising this repository

- Document example
- Add grunt/gulp automation
- Add tests & test infrastructure
- Provide url to download test material

### Credits
Most of this code was inspired by code written by [Sebastian Tschan](https://github.com/blueimp/) whose excellent [Jquery File Upload](https://github.com/blueimp/jQuery-File-Upload) library was used to test this.