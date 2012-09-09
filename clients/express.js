/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License.
*/

module.exports = express;

var resolveFile = require('path').resolve;
var dirName = require('path').dirname;
var readFile = require('fs').readFile;
var pistachio = require('./node.js');

function express(path, options, callback) {
  options = options || {};
  path = options.root ? resolveFile(options.root, path) : path;
  readFile(path, 'utf-8', function(err, data) {
    if (err) return callback(err);
    try {
      data = JSON.parse(data);
      options.template  = options.template || data.pistachio;
    } catch(err) {
      return callback(err);
    }
    if (!options.template && options.defaultTemplate) {
      if ('function' === typeof options.defaultTemplate) {
        return pistachio(options.defaultTemplate, data, callback);
      }
      if ('string' === typeof options.defaultTemplate) {
        if ('(function' === options.defaultTemplate.substr(0, '(function'.length)) {
          pistachio.text(options.defaultTemplate, function(err, tpl) {
            if (err) return callback(err);
            return pistachio(options.defaultTemplate = tpl, data, callback);
          });
        } else {
          pistachio.file(options.defualtTemplate, function(err, tpl) {
            if (err) return callback(err);
            return pistachio(options.defualtTemplate = tpl, data, callback);
          });
        }
        return;
      }
      return callback(new Error('Invalid Template: '));
    }
    if ('function' === typeof options.template) {
      pistachio(options.template, data, callback);
    }
    if ('string' === typeof options.template) {
      if ('(function' === options.template.substr(0, '(function'.length)) {
        pistachio.text(options.template, function(err, tpl) {
          if (err) return callback(err);
          return pistachio(options.template = tpl, data, callback);
        });
      } else {
        pistachio.file(options.template, function(err, tpl) {
          if (err) return callback(err);
          return pistachio(options.template = tpl, data, callback);
        });
      }
    }
    return callback(new Error('Invalid Template: '));
  });
}
