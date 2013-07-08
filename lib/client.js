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
  file(def, options, function(err, fn) {
    if (err) return callback(err);
    if ('function' !== typeof fn) return callback(new Error('invalid pistachio template'));
    callback(null, fn);
  });
}

function render(def, data, options, callback) {
  load(def, options, function(err, fn) {
    if (err) return callback(err);
    var result;
    try {
      result = fn(data, options);
    } catch(ex) {
      return callback(ex);
    }
    callback(null, String(result || ''));
  });
}

function javascript(code, name, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  options = options || {};
  var fn;
  try {
    try {
      code = require('js-beautify').js_beautify(code, { indent_size: 2 });
    } catch(ex) {}
    fn = new Vm.createScript(code, (name||'pistachio://<anonymous>'));
    fn = options.debug ? fn.runInThisContext() : fn.runInNewContext({});
    if ('function' !== typeof fn) throw new Error('Template is not a Function');
  } catch(ex) {
    return callback(ex);
  }
  callback(null, fn);
}

function uncompiled(content, name, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  options.filename = name||'<anonymous>';
  Compiler.parse(content, options, function(err, parsed) {
    if (err) return callback(err);
    if (('object' !== typeof parsed) || (parsed === null) || ('function' !== typeof parsed.code)) return callback(new Error('Invalid Template: '+(name||'<anonymous>')));
    javascript(parsed.code(options), name || '<anonymous>', options, callback);
  });
}

function file(name, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  Fs.readFile(name, 'utf-8', function(err, content) {
    if (err) return uncompiled(name, null, options, callback);
    javascript(content, name, options, function(err, fn) {
      if (!err && ('function' === typeof fn)) return callback(null, fn);
      uncompiled(content, name, options, callback);
    });
  });
}
