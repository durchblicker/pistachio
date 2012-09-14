/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License.
*/

module.exports = exports = express;
module.exports.cache = {};

var pistachio = require('./node.js');
var fs = require('fs');

function express(path, data, callback) {
  data = data || {};
  data.settings = data.settings || {};
  data.settings.cachedPistachio = false;

  if (exports.cache[path]) {
    data.settings.cachedPistachio = true;
    return pistachio.render(exports.cache[path], data, callback);
  }
  pistachio.file(path, function(err, tpl) {
    if (err) return callback(err);
    if (data.settings.cachePistachios) exports.cache[path]=tpl;
    pistachio.render(tpl, data, callback);
  });

}
