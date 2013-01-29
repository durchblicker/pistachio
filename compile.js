#!/usr/bin/env node

/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var argv=require( 'argv' );
var fs=require('fs');
var path=require('path');
var pistachio=require('./index.js').compiler;

var args = argv.info('Pistachio Template Compiler').version('0.1.0').option([
  { name:'out', short:'o', type:'path', description:'The template is written to this file instead of STDOUT' },
  { name:'render', type:'path', description:'output the rendered template with data in this file'},
  { name:'strip-space', type:'boolean', description:'Strip-Space the Template (i.e.: reduce multiple consecutive whitespaces to a single space' },
  { name:'html', type:'boolean', description:'Strip Spaces between > and < (Which is OK in HTML because it would be ignored anyways.'}
]).run();

if (!args.targets.length) {
  argv.help();
  process.exit();
}

var options = {
  stripSpace:(args.options['strip-space'] || args.options.html)?true:false,
  stripTagSpace:args.options.html?true:false
};
pistachio.parse(path.resolve(args.targets[0]), options, function(err, template) {
  if (err) return console.error('Error(parse): '+err.message);
  template = template.code({ beautify:false });
  var stream = args.options.out ? fs.createWriteStream(path.resolve(args.options.out)) : process.stdout;
  if (args.options.render) {
    pistachio.compile(template, options, function(err, template) {
      if (err) return console.error('Error(compile): '+err.message);
      fs.readFile(path.resolve(args.options.render), 'utf-8', function(err, data) {
        if (err) return console.error('Error(data): '+err.message);
        try {
          data = JSON.parse(data);
          data = template(data);
          stream.write(data);
          if (stream !== process.stdout) stream.end();
        } catch(ex) {
          return console.error('Error(render): '+ex.message);
        }
      });
    });
  } else {
    stream.write(template);
    if (stream !== process.stdout) stream.end();
  }
});
