/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = express;
module.exports.options = { debug:false, base:process.cwd() };

var render = require('./client.js').render;

function express(path, data, callback) {
  data = data || {};
  render(path, data, module.exports.options, function(err, html) {
    if (module.exports.options.debug) {
      console.log('Rendered: '+path);
      if (err) console.error(err.stack);
    }
    if ('function' === typeof callback) callback(err, html);
  });
}
