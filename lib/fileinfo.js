var fs = require('fs')
	,	_ = require('underscore');

module.exports = function(options) {

	var FileInfo = function(file) {
		this.name = file.name;
		this.info = file;
	};


	FileInfo.prototype.safename = function() {
		var safe =  this.name.replace(/^\.+/, '')
			,	fileCtr = function (s, index, ext) {
					return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
			};

		while (fs.existsSync(options.uploadDir + '/' + safe)) {
			safe = safe.replace(/(?:(?: \(([\d]+)\))?(\.[^.]+))?$/, fileCtr);
		}

		return safe;
	};

	FileInfo.prototype.validate = function() {
		//TODO: Validate based on passed options
		return true;
	};

	return FileInfo;

};