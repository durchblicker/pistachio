/*
** © 2012 by YOUSURE Tarifvergleich GmbH
*/

var express = require('express');
var app = express();

app.engine('pistachio', require('pistachio').express);
app.set('view engine', 'pistachio');
app.set('views', __dirname);

app.get('/', function(req, res, next) {
  res.render('sample', { 'title':'Pistachio Express', 'product':'Pistachio', 'engine':'Express with dynamic data' }, function(err, html) {
    if (err) return next(err);
    res.send(html);
  });
});

app.listen(8000);
