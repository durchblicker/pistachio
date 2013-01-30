/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = render;
module.exports.load = load;
module.exports.run = run;
module.exports.options = { cache:true };
module.exports.compiler = require('./compiler.js');
module.exports.express = require('./express.js');

var path = require('path');
var vm = require('vm');
var fs = require('fs');

function render(name, data, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  return load(name, undefined, options, function(err, template) {
    if (err) return callback(err);
    return run(template, data, callback);
  });
}

function run(template, data, callback) {
  var err, result;
  try {
    result = template.call(data, data);
  } catch(ex) {
    err = ex;
    data = undefined;
  }
  process.nextTick(function() {
    callback(err, result);
  });
}

function load(name, text, options, callback) {
  options = mergeOptions(module.exports.options, options);
  name = path.resolve(name);
  if (options.cache && load.cache[name]) {
    return process.nextTick(function() {
      return callback(undefined, load.cache[name]);
    });
  }
  fs.readFile(name, 'utf-8', function(err, template) {
    try {
      template = vm.runInThisContext(template);
      if ('function' !== typeof callback) return callback(new Error('Bad Template'));
    } catch(ex) {
      return callback(ex);
    }
    if (options.cache) load.cache[name] = template;
    return callback(undefined, template);
  });
}
load.cache={};

function mergeOptions(def, now) {
  def = ('object' === typeof def) ? def : {};
  now = ('object' === typeof now) ? now : {};
  var res = {};
  Object.keys(def).forEach(function(key) { res[key] = def[key]; });
  Object.keys(now).forEach(function(key) { res[key] = now[key]; });
  return res;
}
