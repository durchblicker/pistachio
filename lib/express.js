/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports.express = express;
module.exports.__express = express;

var render = require('./client.js').render;

function express(path, data, options, callback) {
  if(('function' === typeof options) && !callback) {
    callback = options;
    options = {};
  }
  options = options || {};
  options.base = options.base || process.cwd();
  data = data || {};
  render(path, data, options, function(err, html) {
    if(options.debug) {
      console.log('Rendered: ' + path);
      if(err) console.error(err.stack);
    }
    if('function' === typeof callback) callback(err, html);
  });
}
