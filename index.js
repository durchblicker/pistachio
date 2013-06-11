/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT License.
*/

/*
module.exports = {
  parse: [Function function],
  compile: [Function function],
  template: [Function function],
  render: [Function function],
  load: [Function function],
  express: [Function function]
};
*/

[
  require('./lib/compiler.js'),
  require('./lib/client.js'),
  require('./lib/express.js')
].forEach(function(mod) {
  Object.keys(mod).forEach(function(item) {
    module.exports[item] = mod[item];
  });
});
