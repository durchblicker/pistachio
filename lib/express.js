/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

module.exports = express;
module.exports.options = { debug:true };

var render = require('./client.js');

function express(path, data, callback) {
  data = data || {};
  console.error('Template: '+path);
  render(path, data, module.exports.options, function(err, html) {
    if (err && module.exports.options.debug) console.error(err.stack);
    if ('function' === typeof callback) callback(err, html);
  });
}
