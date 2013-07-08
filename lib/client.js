/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports.render = render;
module.exports.load = load;
module.exports.javascript = javascript;

var Vm = require('vm');
var Fs = require('fs');
var Compiler = require('./compiler.js');

function load(def, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  file(def, function(err, fn) {
    if (err) return callback(err);
    if ('function' !== typeof fn) return callback(new Error('invalid pistachio template'));
    callback(null, fn);
  });
}

function render(def, data, options, callback) {
  load(def, {}, function(err, fn) {
    if (err) return callback(err);
    var result;
    try {
      result = fn.call(data, data, options);
    } catch(ex) {
      return callback(ex);
    }
    callback(null, String(result || ''));
  });
}

function javascript(code, name, callback) {
  var fn;
  try {
    fn = Vm.runInNewContext(code, {}, 'pistachio-template: '+(name||'<anonymous>'));
    if ('function' !== typeof fn) throw new Error('Template is not a Function');
  } catch(ex) {
    return callback(ex);
  }
  callback(null, fn);
}

function uncompiled(content, name, callback) {
  Compiler.parse(content, { filename:name||'<anonymous>' }, function(err, parsed) {
    if (err) return callback(err);
    if (('object' !== typeof parsed) || (parsed === null) || ('function' !== typeof parsed.code)) return callback(new Error('Invalid Template: '+(name||'<anonymous>')));
    javascript(parsed.code(), name || '<anonymous>', callback);
  });
}

function file(name, callback) {
  Fs.readFile(name, 'utf-8', function(err, content) {
    if (err) return uncompiled(name, null, callback);
    javascript(content, name, function(err, fn) {
      if (!err && ('function' === typeof fn)) return callback(null, fn);
      uncompiled(content, name, callback);
    });
  });
}
