#!/usr/bin/env node

/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var fs=require('fs');
var async=require('domain-async');
var compile=require('./jstemplate.js');

var load = async();
process.argv.slice(2).forEach(function(arg, idx) {
  var name, file;
  if (idx) {
    arg = arg.split('=');
    name = arg.shift();
    file = arg.join('=');
  } else {
    name='main';
    file=arg;
  }
  load.then(loadFile.bind(null, name, file));
});
load.done(function(errs, templates) {
  errs = errs.filter(function(err) { return err; });
  if (errs.length) return errs.forEach(function(err) { console.error(err.message); });
  var all = {};
  templates.forEach(function(tpl) {
    all[tpl.template] = tpl;
  });
  all.main = all.main || templates[0];
  process.stdout.write(all.main.compile(false, all).toString());
});

function loadFile(name, file, callback) {
  fs.readFile(file, 'utf-8', function(err, txt) {
    if (err) return callback(err);
    try {
      compile(txt, {
        parsed:function(tpl) { tpl.template=name; callback(undefined, tpl); }
      });
    } catch(err) {
      callback(err);
    }
  });
}
