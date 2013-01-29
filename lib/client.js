/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = render;
module.exports.load = load;
module.exports.run = run;
module.exports.options = { cache:true };
module.exports.compiler = require('./compiler.js');

var path = require('path');

function render(name, data, options, callback) {
  if (('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  load(name, options, function(err, template) {
    run(template, data, callback);
  });
}

function run(template, data, callback) {
  var result;
  try {
    if (!err) result = template.call(data, data);
  } catch(ex) {
    err = ex;
    data = undefined;
  }
  process.nextTick(function() {
    callback(err, result);
  });
}

function load(name, text, options, callback) {
  if ('string' !== typeof text) {
    options = text;
    text = undefined;
  }
  if ('object' !== typeof options) {
    options = {};
  }
  callback = arguments[arguments.length - 1];

  options = mergeOptions(module.exports.options, options);
  name = path.resolve(name);
  if (options.cache && load.cache[name]) process.nextTick(function() {
    return callback(undefined, load.cache[name]);
  });
  module.exports.compiler.compile(text ? text : name, options, function(err, template) {
    if (err) return callback(err);
    if (options.cache) load.cache[name]=template;
    process.nextTick(function() {
      callback(undefined, template);
    });
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
