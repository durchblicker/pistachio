/*
** © 2012 by YOUSURE Tarifvergleich GmbH
*/

module.exports = render;
module.exports.text = loadText;
module.exports.file = loadFile;
module.exports.render = render;

var readFile = require('fs').readFile;
var pistachio = require('../lib/pistachio.js');
var run = require('vm').runInThisContext;

function render(fn, data, callback) {
  process.nextTick(function() {
    var err, val;
    try {
      val=fn(data);
    } catch(ex) {
      err=ex;
    }
    callback(err, val);
  });
}

function loadFile(file, callback) {
  readFile(file, 'utf-8', function(err, text) {
    if (err) return callback(err);
    return loadText(text, file, callback);
  });
}

function loadText(text, filename, callback) {
  if ('function' === typeof filename) {
    callback = filename;
    filename = 'template.pistachio';
  }
  filename = filename || 'template.pistachio';
  if ('function' !== typeof callback) return run(text, filename);
  process.nextTick(function() {
    var err, val;
    try {
      val = run(text, filename);
      if ('function' !== typeof val) throw new Error('Invalid Template');
    } catch(ex) {
      err = ex;
    }
    callback(err, val);
  });
}
