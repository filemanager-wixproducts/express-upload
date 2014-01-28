express-upload
==============

express.js file upload middleware

### Changelog

* v0.1 Multipart file upload to server as express middleware. With elaborate example app

* v0.2 Multipart file upload (skip server) streamed direct to Amazon S3 with aws-sdk multipart api stream wrapper.
* v0.2.1 Multiple Updates
  - Refactoring and removal of console.log statements for debugging. Nice to know but after a while it's all clutter. Middleware emits messages & errors now.
  - Updated credentials handling, DRYer (double credentials before was ridiculous)
  - Finish statement works better, when testing locally make sure you handle ajax post request timeout of jquery because amazon might take a while to push chunks.



### Description
This is an express middleware module to handle file uploads. It uses the popular [node-formidable](https://github.com/felixge/node-formidable) to parse the incoming http and works very well with [jquery-file-upload](https://github.com/blueimp/jQuery-File-Upload).

### Basic Usage
In order to process multipart file uploads that are send by an html form to for example `/upload` just add the following middleware element to express.

	app.use('/upload', upload.handler({ /* option overrides go here */ }));

And ofcourse declare upload as such:

	var upload = require('express-upload');

It will be instantiated with the following default options (which are overridable as shown above):

```javascript
{ 
  dirs: {
    tmp: process.env.TMP || process.env.TMPDIR || process.env.TEMP || '/tmp' || process.cwd(),
    upload: './upload'
  },
  maxPostSize: 11*1024*1024*1024,
  maxFileSize: 10*1024*1024*1024,
  minFileSize: 1,
  aws: {
    secret: {
      accessKeyId: '',
      secretAccessKey: '',
    },
    bucket: '',
    region: '',
    maxRetries: 15
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
}
```

the `upload.handler()` middleware above can be replaced with `upload.s3handler()` ofcourse to handle uploads directly to S3. (Provide AWS Options)

### Example
![screen](http://oi43.tinypic.com/n6vy4l.jpg "Screenshot Example")

The application provided is a little more elaborate than the bare minimum but shows the workings quite well (I think).

It's assumed you have node/npm and bower installed, if not check [here](http://nodejs.org/download/) and [here](http://bower.io/). 

To run the example please first run `bower install` & `npm install` in the root directory of the example. Also `npm install` in the root of the repository if you haven't done so already. 

After bower & npm dependencies are finished installing, the application can be initiated with `node app.js` (I prefer `nodemon app.js` but whatever) and will run at [localhost:3000](http://localhost:3000).

Express will redirect to the Server Upload method at `/upload`. Going to [localhost:3000/s3upload](http://localhost:3000/s3upload) however will get you the S3 Multipart Upload method.

**IMPORTANT** When using the S3 method please make sure you have a `credentials.json` file in your example folder with the following structure (refactor at will ofcourse).

```javascript
{
  "aws": {
    "secret": {
      "accessKeyId": '',
      "secretAccessKey": '',
    },
    "bucket": '',
    "region": '',
    "maxRetries": 15
  }
}
```

### Todo
Below are some items to be done before publicising this repository

- Add grunt/gulp automation
- Add tests & test infrastructure
- Provide url to download test material
- Added S3 Layer adds Extra Errors to Propagate back to Client, Must Propagate Properly :)
- Complete [handler.js](https://github.com/devcollectief/express-upload/blob/master/lib/handler.js) for OPTIONS, HEAD, GET, PUT, DELETE requests, currently only POST is implemented.

### Credits
Most of this code was inspired reading code written by [Sebastian Tschan](https://github.com/blueimp/) whose excellent [Jquery File Upload](https://github.com/blueimp/jQuery-File-Upload) library was used to test this.
