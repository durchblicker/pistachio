/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = require('./compiler.js');
module.exports.render = render;
module.exports.load = load;
module.exports.options = { cache:true };
module.exports.express = require('./express.js');

var path = require('path');
var vm = require('vm');
var fs = require('fs');

function render(template, data, options, callback) {
  load(template, options, function(err, tpl) {
    if (err) return callback(err);
    try {
      tpl = tpl.call(data, data);
    } catch(ex) {
      return callback(ex);
    }
    return callback(undefined, tpl);
  });
}

function load(template, options, callback) {
  function serveTemplate(err, tplFN) {
    if (err) return callback(err);
    if (options.cache) load.cache[options.filename]=tplFN;
    return callback(undefined, tplFN);
  }
  if (options.cache && ('function' === typeof load.cache[template])) return process.nextTick(function() {
    return callback(undefined, load.cache[template]);
  });
  options = mergeOptions(module.exports.options, options);
  fs.stat(template, function(err, stat) {
    if (err || !stat || !stat.isFile()) {
      if (template.indexOf('(function(') === 0) {
        template = tplScript(template);
        if (!template) return callback(new Error('Invalid Template'));
        return serveTemplate(undefined, template);
      }
      return module.exports.compiler.template(template, options, serveTemplate);
    }
    return fs.readFile(template, 'utf-8', function(err, code) {
      if (err) return callback(err);
      options.filename = template;
      if (code.indexOf('(function(') === 0) {
        template = tplScript(code);
        if (!template) return callback(new Error('Invalid Template'));
        return serveTemplate(undefined, template);
      }
      return module.exports.compiler.template(code, options, serveTemplate);
    });
  });
}
load.cache = {};

function tplScript(template) {
  try {
    template = vm.runInThisContext(template);
  } catch(ex) {
    return undefined;
  }
  return ('function' === typeof template)?template:undefined;
}
function mergeOptions(def, now) {
  def = ('object' === typeof def) ? def : {};
  now = ('object' === typeof now) ? now : {};
  var res = {};
  Object.keys(def).forEach(function(key) { res[key] = def[key]; });
  Object.keys(now).forEach(function(key) { res[key] = now[key]; });
  return res;
}
