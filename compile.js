#!/usr/local/bin/node

/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var Path = require('path');
var Fs = require('fs');
var Pea = require('pea');
var Package = require('./package.json');
var Program = require('commander');
var Pistachio = require(Package.main);

Program.version(Package.version);
Program.description(Package.description);
Program.option('-o, --out <file>', 'send output to file', Path.resolve);
Program.option('--strip-space', 'reduce multiple consecutive whitespaces to a single space');
Program.option('--html', 'strip spaces between > and < (Which is OK in HTML because it would be ignored anyways.)');
Program.option('-r, --render <file>', 'compile and then render using <file> as data-json', Path.resolve);
Program.command('*').action(function(template){
  var options = {
    stripSpace:!!Program.stripSpace,
    stripTagSpace:!!Program.html
  };
  Pea(Pistachio.compile, template, options).next(Pea(function(callback) {
    var template = this.previousValue, json;
    if (Program.render) {
      var json = Pea(Fs.readFile, Program.render, 'utf-8');
      var parse = Pea(parsejson);
      var load = Pea(Pistachio.javascript, template, '<anonymous>');
      var render = Pea(function(callback) {
        try {
          template = template(json);
        } catch(err) {
          return callback(err);
        }
        callback();
      });
      var write =Pea(function save(fn) {
        if (Program.out) {
          Pea(Fs.writeFile, Program.out, template).then(callback);
        } else {
          process.stdout.write(template);
          callback();
        }
      });
      json.next(parse).next(load).next(Pea(settpl)).next(render).next(write).failure(callback);

      function parsejson(callback) {
        try {
          json = JSON.parse(this.previousValue);
        } catch(err) {
          return callback(err);
        }
        callback();
      }
      function settpl(callback) {
        template = this.previousValue;
        callback()
      }
    } else {
      if (Program.out) {
        Pea(Fs.writeFile, Program.out, template).then(callback);
      } else {
        process.stdout.write(template);
        callback();
      }
    }
  })).error(function(err) {
    console.error('ERROR: ', err.message);
  });
});
Program.parse(process.argv);
