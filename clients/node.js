/*
** © 2012 by YOUSURE Tarifvergleich GmbH
*/

module.exports = render;
module.exports.text = loadText;
module.exports.file = loadFile;

var readFile = require('fs').readFile;

function render(fn, data, callback) {
  if ('string' === typeof fn) return loadFile(fn, function(err, tpl) {
    if (err) return callback(err);
    return render(tpl, data, callback);
  });
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
    return loadText(text, callback);
  });
}
function loadText(text, callback) {
  process.nextTick(function() {
    var err, val;
    try {
      val = eval(text);
      if ('function' !== typeof val) throw new Error('Invalid Template');
    } catch(ex) {
      err = ex;
    }
    callback(err, val);
  });
}
