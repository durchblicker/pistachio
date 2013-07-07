/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT-License.
*/

module.exports.parse = parseTemplate;
module.exports.compile = compileTemplate;
module.exports.template = functionTemplate;
module.exports.compile.Document = Document;
module.exports.compile.TextDocument = TextDocument;

var fs = require('fs');
var path = require('path');
var Pea = require('pea');
var glob = require('glob');
var vm = require('vm');
var UglifyJS = require('uglify-js');

function parse(text, options, callback) {
  Object.keys(parse.replace).forEach(function(item) {
    text = text.replace(parse.replace[item].search, parse.replace[item].replace);
  });
  if(options && options.stripTagSpace) {
    text = text.replace(/>\s+</g, '><');
    /*
    .replace(/<script([^>]*?)>([\s|\S]*?)<\/script>/g, function(match, tag, script) {
      if(!script.length) return match;
      script = script.replace(/\/\*[\s|\S]*?\*\//g, '').split(/\r?\n/).map(function(line) {
        var p = [];
        line = line.replace(/([\"|\'])([\s|\S]*?)\1/g, function(m, q, c) {
          p.push(q + c + q);
          return '\u0000\u0001' + (p.length - 1) + '\u0001\u0000';
        });
        line = line.split('//').shift();
        return line.replace(/\u0000\u0001(\d+)\u0001\u0000/g, function(m, idx) {
          return p[parseInt(idx, 10)];
        });
      }).join(' ').replace(/\s+/, ' ');
      return [
        '<script' + tag + '>',
      script,
        '</script>'].join('');
    });*/
  }

  var parts = [];
  text = text.replace(parse.item.delta, function(match, name, content) {
    parts.push(new Delta(name, content));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.section, function(match, name, expression, content) {
    parts.push(new Section(name, expression, content));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.partial, function(match, filename) {
    parts.push(new Partial(filename));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.globbed, function(match, glob) {
    parts.push(new Globbed(glob));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.expression, function(match, expression) {
    parts.push(new Expression(expression));
    return parse.marker(parts.length - 1);
  });
  text = text.split(parse.marker.frame).map(function(item, idx) {
    return(idx % 2) ? parts[parseInt(item, 10)] : new Content(item, options);
  });
  Pea.each(text, function(item, callback) {
    item.parse(options, function(err) {
      if(err) {
        console.error(options.filename);
        console.error('  ' + item.toString());
        console.error(err.message.split(/\r?\n/).map(function(line) {
          return '    ' + line;
        }).join('\n'));
      }
      callback(err);
    });
  }).success(function() { callback(null, text); }).failure(callback);
}

function stringExpression(str) {
  return '\'' + String(str || '').split('\\').join('\\\\').split('\'').join('\\\'').split('\r').join('\\r').split('\n').join('\\n').split('\t').join('\\t') + '\'';
}

parse.replace = {};
parse.replace.unescaped = {
  search: /\{\{\{\s*(\S+?)\s*\}\}\}/g,
  replace: function(match, expression) {
    return '{{#! this[' + stringExpression(expression) + '] }}';
  }
};
parse.replace.ampunescaped = {
  search: /\{\{\&\s*(\S+?)\s*\}\}/g,
  replace: function(match, expression) {
    return '{{#! this[' + stringExpression(expression) + '] }}';
  }
};
parse.replace.escaped = {
  search: /\{\{(?=[^\>|\/|\#|\^])\s*(\S+?)\s*\}\}/g,
  replace: function(match, expression) {
    return '{{#! $escape(this[' + stringExpression(expression) + ']) }}';
  }
};
parse.replace.section = {
  search: /\{\{\#(?=[^!|\#])(\S+)\s*\}\}([\S|\s]*?)\{\{\/\1\s*\}\}/g,
  replace: function(match, expression, content) {
    return '{{#!' + expression + ' this[' + stringExpression(expression) + '] }}' + content + '{{/' + expression + '}}';
  }
};
parse.replace.notsection = {
  search: /\{\{\^(\S+)\s*\}\}([\S|\s]*?)\{\{\/\1\s*\}\}/g,
  replace: function(match, expression, content) {
    return '{{#!' + expression + ' !this[' + stringExpression(expression) + '] }}' + content + '{{/' + expression + '}}';
  }
};
parse.replace.delta = {
  search: /\{\{\#\#\!(\S+?)\s+([\S|\s]+?)\s*\}\}/g,
  replace: function(match, name, expression) {
    return '{{#!'+name+' '+expression+' }}{{#! _delta['+JSON.stringify(name)+']('+name+') }}{{/'+name+'}}';
  }
};

parse.item = {};
parse.item.section = /\{\{\#\!(\S+)\s+([\s|\S]+?)\s*\}\}([\s|\S]*?)\{\{\s*\/\s*\1\s*\}\}/g;
parse.item.partial = /\{\{\s*\>\s*(\S*?)\s*\}\}/g;
parse.item.expression = /\{\{\#\!\s*([\s|\S]*?)\s*\}\}/g;
parse.item.delta = /\{\{\#\#\s*(\S+?)\s*\}\}([\S|\s]*?)\{\{\#\/\s*\1\s*\}\}/g;
parse.item.globbed = /\{\{\#\>\s*(\S+?)\s*\}\}/g;

parse.marker = function(idx) {
  return [
  parse.marker.frame,
  idx,
  parse.marker.frame].join('');
};
parse.marker.frame = '\u0000\u0000';

function mergeOptions(def, now) {
  def = ('object' === typeof def) ? def : {};
  now = ('object' === typeof now) ? now : {};
  var res = {};
  Object.keys(def).forEach(function(key) {
    res[key] = def[key];
  });
  Object.keys(now).forEach(function(key) {
    res[key] = now[key];
  });
  return res;
}

function displayText(expression) {
  return expression.split(/\r?\n/).join(' ').replace(/\s+/g, ' ').substr(0, 100);
}

function indent(lvl) {
  var res = [],
    idx;
  for(idx = 0; idx < lvl; idx += 1) {
    res.push('  ');
  }
  return res.join('');
}

function Template(construct) {}
Template.prototype.parse = function(options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  return callback();
};
Template.prototype.code = function() {
  return "''";
};
Template.prototype.partials = function() {
  return [];
};

function Content(text) {
  Template.call(this, true);
  this.text = String(text);
}
Content.prototype = new Template();
Content.prototype.parse = function(options, callback) {
  var len;
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  options = options || {};

  if(options && options.stripSpace) {
    len = this.text.length;
    this.text = this.text.replace(/\s+/g, ' ');
  }
  if(options && options.stripTagSpace) {
    len = this.text.length;
    this.text = this.text.replace(/>\s+</g, '><');
  }
  return callback();
};
Content.prototype.code = function() {
  return [
    '\'',
  this.text.split('\\').join('\\\\').split('\'').join('\\\'').split('\r').join('\\r').split('\n').join('\\n'),
    '\''].join('');
};
Content.prototype.toString = function() {
  return ['Content():', displayText(this.text)].join(' ');
};

function Expression(expression) {
  Template.call(this, true);
  Object.defineProperty(this, 'expression', {
    value: expression.replace(/^\s*|\s*$/g, '').replace(/\;\s*$/g, '')
  });
}
Expression.prototype = new Template();
Expression.prototype.parse = function(options, callback) {
  try {
    vm.createScript('(' + this.expression + ')', 'expression');
  } catch(ex) {
    if(!options.force) return callback(new Error(options.filename + '(Expression): ' + ex.message + '\n' + this.expression));
  }
  return callback();
};
Expression.prototype.code = function() {
  return [
    '(',
  this.expression,
    ')'].join('');
};
Expression.prototype.toString = function() {
  return ['Expression():', displayText(this.expression)].join(' ');
};

function Section(name, expression, content) {
  Template.call(this, true);
  if(name) {
    Object.defineProperty(this, 'name', {
      value: name
    });
    Object.defineProperty(this, 'expression', {
      value: expression.replace(/^\s*|\s*$/g, '').replace(/\;\s*$/g, '')
    });
    Object.defineProperty(this, 'content', {
      value: content
    });
  }
}
Section.prototype = new Template();
Section.prototype.parse = function(options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  try {
    vm.createScript('(' + this.expression + ')', this.name);
  } catch(ex) {
    if(!options.force) return callback(new Error(options.filename + '(Section:' + this.name + '): ' + ex.message + '\n' + this.expression));
  }
  var that = this;
  parse(this.content, options, function(err, parts) {
    if(err) return callback(err);
    Object.defineProperty(that, 'parts', {
      value: parts
    });
    return callback();
  });
};
Section.prototype.partials = function() {
  var result = [];
  this.parts.forEach(function(part) {
    result = result.concat(part.partials());
  });
  return result;
};
Section.prototype.code = function(lvl) {
  var code = [];
  code.push('(function('+ this.name +') {');
  code.push('  ' + this.name + '=(("undefined" === typeof ' + this.name + ') || (' + this.name + '===false) || (' + this.name + '===null))?[]:' + this.name + ';');
  code.push('  ' + this.name + '=$array(' + this.name + ');');
  code.push('  return $join($each(' + this.name + ', function(' + this.name + ', _index_, _list_) {');
  code.push('    return $join([\n' + this.parts.filter(function(part) {
    return part.code()!=="''";
  }).map(function(part) {
    return part.code(lvl + 1);
  }).join(',\n') + indent(lvl) + '\n]);');
  code.push('  }));');
  code.push('}.call(this,'+this.expression+'))');
  return code.map(function(line) {
    return indent(lvl) + line;
  }).join('\n');
};
Section.prototype.toString = function() {
  return ['Section(', this.name, '): ', displayText(this.expression)].join('');
};

function Delta(name, content) {
  this.name = name;
  this.content = content;
}
Delta.prototype = new Template();
Delta.prototype.parse = function(options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var that = this;
  parse(this.content, options, function(err, parts) {
    if(err) return callback(err);
    Object.defineProperty(that, 'parts', {
      value: parts
    });
    return callback();
  });
};
Delta.prototype.partials = function() {
  var result = [];
  this.parts.forEach(function(part) {
    result = result.concat(part.partials());
  });
  return result;
};
Delta.prototype.code = function(lvl) {

  var delta =[];
  delta.push('(_delta['+JSON.stringify(this.name)+']=function('+this.name+') {');
  delta.push('return (function() {');
  delta.push('return $join([');
  delta.push(this.parts.filter(function(part) {
    return part.code()!=="''";
  }).map(function(part) {
    return part.code();
  }).join(','));
  delta.push(']);');
  delta.push('}).call('+this.name+');');
  delta.push('})?"":""');
  delta = delta.join('');
  return '('+delta+')';
};

function Partial(filename) {
  Template.call(this, true);
  if(filename) {
    Object.defineProperty(this, 'filename', {
      value: filename
    });
  }
}
Partial.prototype = new Template();
Partial.prototype.parse = function(options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var that = this;
  options = mergeOptions(options, {
    filename: options.filename ? path.resolve(path.dirname(options.filename), this.filename) : path.resolve(this.filename)
  });
  Object.defineProperty(this, 'fullpath', {
    value: options.filename
  });
  fs.readFile(this.fullpath, 'utf-8', function(err, text) {
    if(err) return callback(err);
    parse(text, options, function(err, parts) {
      if(err) return callback(err);
      Object.defineProperty(that, 'parts', {
        value: parts
      });
      return callback();
    });
  });
};
Partial.prototype.partials = function() {
  var result = [this.fullpath];
  this.parts.forEach(function(part) {
    result = result.concat(part.partials());
  });
  return result;
};
Partial.prototype.code = function(lvl) {
  var code = [];
  code.push('$join([');
  code = code.concat(this.parts.filter(function(part) {
    return part.code()!=="''";
  }).map(function(part) {
    return indent(lvl + 1) + part.code();
  }).join(',\n'));
  code.push('])');
  return code.map(function(line) {
    return indent(lvl) + line;
  }).join('\n');
};
Partial.prototype.toString = function() {
  return ['Partial(', this.fullpath || this.filename, ')'].join('');
};

function Globbed(glob) {
  if(glob) {
    Object.defineProperty(this, 'glob', {
      value: glob
    });
  }
  this.parts=[];
};
Globbed.prototype = new Template();
Globbed.prototype.parse = function(options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var that = this;
  var base = options.filename ? path.dirname(options.filename) : process.cwd();
  glob(this.glob, { cwd:base }, function(err, files) {
    if(err) return callback(err);
    Object.defineProperty(that, 'parts', {
      value: files.map(function(file) {
        return new Partial(path.resolve(base,file));
      })
    });
    Pea.each(that.parts, function(part, callback) {
      part.parse(options, callback);
    }).then(callback);
  });
};
Globbed.prototype.partials = function() {
  var result = [];
  this.parts.forEach(function(part) {
    result = result.concat(part.partials());
  });
  return result;
};
Globbed.prototype.code = function(lvl) {
  var pieces=[];
  this.parts.forEach(function(part) {
    pieces = pieces.concat(part.parts);
  });
  return ['$join([',pieces.map(function(piece) {
    return piece.code(lvl);
  }).join(','),'])'].join('');
};
Globbed.prototype.toString = function() {
  return ['Globbed(', this.glob, ')'].join('');
};

function cleanCode(code) {
  return ['(', String(code || '').replace(/^\!/, '').replace(/^\s*(?:\(\s*)|(?:\s*\))?\s*;?\s*$/g, ''), ')'].join('');
}

function Document(filename) {
  Partial.call(this, filename);
  if(filename) {
    this.makeCode = Partial.prototype.code;
  }
}
Document.prototype = new Partial();
Document.prototype.code = function(options) {
  options = mergeOptions(options);
  var result = [];
  result.push('(function(data) {');
  result.push('  function $each(a,f) { var i,m=[]; for(i=0;i<a.length;i+=1) { m.push(f.call(a[i],a[i],i,a)); } return m; };');
  result.push('  function $filter(arr, iter) { arr=$array(arr); var res=[]; for (var idx=0; idx<arr.length; idx++) { if (iter.call(arr, arr[idx], idx, arr)) res.push(arr[idx]); } return res;};');
  result.push('  function $keys(obj) { if ("object" !== typeof obj) return []; if ("function"===typeof Object.keys) return Object.keys(obj); var res=[]; for (var item in obj) { if (obj.hasOwnProperty(item)) res.push(item); } return res; };');
  result.push('  function $escape(t) { t=t+""; return t.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split(\'"\').join("&quot;"); };');
  result.push('  function $isarray(a) { return (Array.isArray && Array.isArray(a)) || (("object"===typeof a) && (null !== a) && (a.constructor === [].constructor)); };');
  result.push('  function $array(a) { return $isarray(a)?a:[a]; };');
  result.push('  function $join(a, c) { return $array(a).join(c||""); };');
  result.push('  function $strip(t) { return String(t).split(/\\r?\\n/).join(" ").split(/\\s+/).join(" ").split("> <").join("><").replace(/^\\<\\!DOCTYPE\\s([\\s|\\S]+?)\\>\\s*/,"<!DOCTYPE $1>\\n"); };');
  result.push('  var memo={}, _delta={}, root=data;');
  result.push('  return ' + (options.stripTagSpace ? '$strip' : '') + '(function() {');
  result.push('    return ' + this.makeCode(1) + ';');
  result.push('  }.call(data));');
  result.push('})');
  result = result.join('\n');

  if(options.beautify) return cleanCode(result);

  var ast = UglifyJS.parse(result + '()', {
    filename: 'pistachio'
  });

  if(!options.nocompress) {
    var compress = UglifyJS.Compressor(mergeOptions({
      hoist_vars: true,
      hoist_funs: true,
      unsafe_comps: true,
      warnings: false
    }, options.uglify));
    ast.figure_out_scope();
    ast.transform(compress);
  }

  if(!options.beautify) {
    ast.figure_out_scope();
    ast.compute_char_frequency({});
    ast.mangle_names({});
  }

  ast = ast.print_to_string().replace(/\(\s*\)\s*;?\s*$/, '');
  return cleanCode(ast);
};
Document.prototype.template = function(options) {
  var template = this.code(options);
  try {
    template = vm.runInThisContext(template);
  } catch(ex) {
    return undefined;
  }
  return('function' === typeof template) ? template : undefined;
};
Document.prototype.toString = function() {
  return ['Document(', this.fullpath || this.filename, ')'].join('');
};

function TextDocument(text) {
  Section.call(this, 'root', 'root', text);
  if(text) {
    this.makeCode = Section.prototype.code;
  }
}
TextDocument.prototype = new Section();
TextDocument.prototype.code = Document.prototype.code;
TextDocument.prototype.template = Document.prototype.template;
TextDocument.prototype.toString = function() {
  return ['TextDocument()'].join('');
};

function parseFile(filename, options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var doc = new Document(filename);
  doc.parse(options, function(err) {
    if(err) return callback(err);
    return callback(undefined, doc);
  });
}

function parseText(content, options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var doc = new TextDocument(content);
  doc.parse(options, function(err) {
    if(err) return callback(err);
    return callback(undefined, doc);
  });
}

function parseTemplate(template, options, callback) {
  if(('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  template = String(template);
  fs.stat(template, function(err, stat) {
    ((err || !stat || !stat.isFile()) ? parseText : parseFile)(template, options, callback);
  });
}

function compileTemplate(template, options, callback) {
  parseTemplate(template, options, function(err, template) {
    if(err) return callback(err);
    return callback(undefined, template.code());
  });
}

function functionTemplate(template, options, callback) {
  parseTemplate(template, options, function(err, template) {
    if(err) return callback(err);
    return callback(undefined, template.template());
  });
}
