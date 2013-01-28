/*
** © 2012 by YOUSURE Tarifvergleich GmbH
*/

module.exports = require('./lib/pistachio.js');
module.exports.render = require('./clients/node.js');
module.exports.loadText = module.exports.render.text;
module.exports.loadFile = module.exports.render.file;
module.exports.__express = module.exports.express = require('./clients/express.js');
module.exports.async = require('./lib/async.pistachio.js');
