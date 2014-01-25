var fs = require("fs"),
  params = process.argv.splice(2, process.argv.length - 2),
  size = 0,
  filename = __dirname + '/fake.mp4',
  content = '',
  i = 0;

if (params.length === 0) {
  console.log('Specify a file size in bytes');
  return;
}

size = params[0];
if (isNaN(parseInt(size, 10))) {
  console.log('Size must be a number');
  return;
}

for (; i < size; i = i + 1) {
  content = content + '.';
}

fs.writeFile(filename, content, 'utf8');