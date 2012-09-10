/*
** © 2012 by YOUSURE Tarifvergleich GmbH
*/

var express = require('express');
var app = express();

var pistachioOptions={
  'cache':true,
  'template':__dirname+'/sample.compiled.tpl'
};

app.engine('pistachio', require('../../index.js').express);
app.set('view engine', 'pistachio');
app.set('views', __dirname);
app.get('/', function(req, res, next) {
  res.render('sample', pistachioOptions, function(err, html) {
    if (err) return next(err);
    res.send(html);
  });
});
app.get('/other', function(req,res, next) {
  res.render('sample', {
    'data':{
      'title':'Another Pistachio Express Sample',
      'product':'Pistachio',
      'engine':'Express with dynamic data'
    },
    'template':__dirname+'/sample.compiled.tpl'
  }, function(err, html) {
    if (err) return next(err);
    res.send(html);
  });

});
app.listen(8000);
