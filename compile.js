#!/usr/bin/env node

/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var argv=require( 'argv' );
var fs=require('fs');
var path=require('path');
var pistachio=require('./lib/async.pistachio.js');

var args = argv.info('Pistachio Template Compiler').version('0.1.0').option([
  { name:'out', short:'o', type:'path', description:'The template is written to this file instead of STDOUT' },
  { name:'render', type:'path', description:'output the rendered template with data in this file'}
]).run();

if (!args.targets.length) {
  argv.help();
  process.exit();
}

pistachio.parse(path.resolve(args.targets[0]), function(err, template) {
  if (err) return console.error(err.message);
  template = template.code();
  var stream = args.options.out ? fs.createWriteStream(path.resolve(args.options.out)) : process.stdout;
  if (args.options.render) {
    pistachio.compile(template, function(err, template) {
      if (err) return console.error(err.message);
      fs.readFile(path.resolve(args.options.render), 'utf-8', function(err, data) {
        if (err) return console.error(err.message);
        try {
          data = JSON.parse(data);
          data = template(data);
          stream.write(data);
          if (stream !== process.stdout) stream.end();
        } catch(ex) {
          return console.error(ex.stack);
        }
      });
    });
  } else {
    stream.write(template);
    if (stream !== process.stdout) stream.end();
  }
});
