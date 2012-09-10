/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License.
*/

module.exports = express;

var resolveFile = require('path').resolve;
var dirName = require('path').dirname;
var readFile = require('fs').readFile;
var pistachio = require('./node.js');

var cache={};
function express(path, options, callback) {
  if (options.data) {
    var data = options.data;
    if (cache[options.template]) {
      try {
        data = cache[options.template](data);
      } catch(err) {
        return callback(err);
      }
      return callback(undefined, data);
    }
    return pistachio.file(options.template, function(err, tpl) {
      if (err) return callback(err);
      if (options.cache) cache[options.template]=tpl;
      try {
        data = cache[options.template](data);
      } catch(err) {
        return callback(err);
      }
      return callback(undefined, data);
    });
  }
  readFile(path, 'utf-8', function(err, data) {
    if (err) return callback(err);
    try {
      data = JSON.parse(data);
      options.template  = data.pistachio || options.template;
    } catch(err) {
      return callback(err);
    }
    if (cache[options.template]) {
      try {
        data = cache[options.template](data);
      } catch(err) {
        return callback(err);
      }
      return callback(undefined, data);
    }
    pistachio.file(options.template, function(err, tpl) {
      if (err) return callback(err);
      if (options.cache) cache[options.template]=tpl;
      try {
        data = cache[options.template](data);
      } catch(err) {
        return callback(err);
      }
      return callback(undefined, data);
    });
  });
}
