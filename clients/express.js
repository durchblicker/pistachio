/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var resolveFile = require('path').resolve;
var dirName = require('path').dirname;
var readFile = require('fs').readFile;
var pistachio = require('./node.js');

var tplCache = {};

function express(path, options, callback) {
  options = options || {};
  path = options.root ? resolveFile(options.root, path) : path;
  readFile(path, 'utf-8', function(err, data) {
    if (err) return callback(err);
    try {
      data = JSON.parse(data);
      if(!options.template) {
        if (!data.pistachio) throw new Error('No Template Specified');
        options.template = resolveFile(dirName(path), data.pistachio);
      }
    } catch(err) {
      return callback(err);
    }
    if (tplCache[options.template]) {
      return pistachio(tplCache[options.template], data, callback);
    }
    pistachio.file(options.template, function(err, tpl) {
      if (err) callback(err);
      tplCache[options.template] = tpl;
      return pistachio(tplCache[options.template], data, callback);
    });
  });
}
