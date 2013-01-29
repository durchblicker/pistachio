/*
** © 2013 by Philipp Dunkel <p.dunkel@me.com>. Licensed under MIT-License.
*/

module.exports = compile;
module.exports.parse = parseTemplate;
module.exports.compile = compileTemplate;

var fs = require('fs');
var path = require('path');
var async = require('async');
var vm=require('vm');
var UglifyJS = require('uglify-js');

function parse(text, options, callback) {
  Object.keys(parse.replace).forEach(function(item) {
    text = text.replace(parse.replace[item].search, parse.replace[item].replace);
  });

  var parts = [];
  text = text.replace(parse.item.section, function(match, name, expression, content) {
    parts.push(new Section(name, expression, content));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.partial, function(match, filename) {
    parts.push(new Partial(filename));
    return parse.marker(parts.length - 1);
  });
  text = text.replace(parse.item.expression, function(match, expression) {
    parts.push(new Expression(expression));
    return parse.marker(parts.length - 1);
  });

  text = text.split(parse.marker.frame).map(function(item, idx) {
    return (idx % 2) ? parts[parseInt(item,10)] : new Content(item, options);
  });
  async.forEachSeries(text, function(item, callback) {
    item.parse(options, function(err) {
      if (err) {
        console.error(item.toString());
        console.error(err.message.split(/\r?\n/).map(function(line) { return '    '+line; }).join('\n'));
      }
      callback(err);
    });
  }, function(err) {
    if (err) return callback(err);
    return callback(undefined, text);
  });
}

function stringExpression(str) {
  return String(str || '').split('\\').join('\\\\').split('\'').join('\\\'').split('\r').join('\\r').split('\n').join('\\n').split('\t').join('\\t');
}

parse.replace = {};
parse.replace.unescaped = { search:/\{\{\{\s*(\S+?)\s*\}\}\}/g, replace:function(match, expression) { return '{{#! this['+stringExpression(expression)+'] }}'; } };
parse.replace.ampunescaped = { search:/\{\{\&\s*(\S+?)\s*\}\}/g, replace:function(match, expression) { return '{{#! this['+stringExpression(expression)+'] }}'; } };
parse.replace.escaped = { search:/\{\{(?=[^\>|\/])\s*(\S+?)\s*\}\}/g, replace:function(match, expression) { return '{{#! esc(this['+stringExpression(expression)+']) }}'; } };
parse.replace.section = { search:/\{\{\#(?=[^!])(\S+)\s+(\S+?)\s*\}\}\}([\S|\s]*?)\{\{\/\1\}\}/g, replace:function(match, name, expression, content) { return '{{#!'+name+' this['+stringExpression(expression)+'] }}'+content+'{{/'+name+'}}'; } };
parse.replace.notsection = { search:/\{\{^(\S+)\s+(\S+?)\s*\}\}\}([\S|\s]*?)\{\{\/\1\}\}/g, replace:function(match, name, expression, content) { return '{{#!'+name+' !(this['+stringExpression(expression)+']) }}'+content+'{{/'+name+'}}'; } };

parse.item = {};
parse.item.section = /\{\{\#\!(\S+)\s+([\s|\S]+?)\s*\}\}([\s|\S]*?)\{\{\s*\/\s*\1\s*\}\}/g;
parse.item.partial = /\{\{\s*\>\s*(\S*?)\s*\}\}/g;
parse.item.expression = /\{\{\#\!\s*([\s|\S]*?)\s*\}\}/g;



parse.marker = function(idx) {
  return [
    parse.marker.frame,
    idx,
    parse.marker.frame
  ].join('');
};
parse.marker.frame = '\0\0';

function mergeOptions(def, now) {
  def = ('object' === typeof def) ? def : {};
  now = ('object' === typeof now) ? now : {};
  var res = {};
  Object.keys(def).forEach(function(key) { res[key] = def[key]; });
  Object.keys(now).forEach(function(key) { res[key] = now[key]; });
  return res;
}
function displayText(expression) {
  return expression.split(/\r?\n/).join(' ').replace(/\s+/g,' ').substr(0,100);
}
function indent(lvl) {
  var res = [];
  for (var idx=0; idx<lvl; idx+=1) res.push('  ');
  return res.join('');
}

function Template(construct) {
}
Template.prototype.parse = function(options, callback) {
  if (('function' === typeof options) && (!callback)) {
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
  Object.defineProperty(this, 'text', { value:text });
}
Content.prototype = new Template();
Content.prototype.code = function() {
  return [
    '\'',
    this.text.split('\\').join('\\\\').split('\'').join('\\\'').split('\r').join('\\r').split('\n').join('\\n'),
    '\''
  ].join('');
};
Content.prototype.toString = function() {
  return  [ 'Content():', displayText(this.text) ].join(' ');
};

function Expression(expression) {
  Template.call(this, true);
  Object.defineProperty(this, 'expression', { value:expression.replace(/^\s*|\s*$/g,'').replace(/\;\s*$/g,'') });
}
Expression.prototype = new Template();
Expression.prototype.parse = function(options, callback) {
  try {
    vm.createScript('('+this.expression+')', 'expression');
  } catch(ex) {
    if (!options.force) return callback(new Error(options.filename+'(Expression): '+ex.message+'\n'+this.expression));
  }
  return callback();
};
Expression.prototype.code = function() {
  return [
    '(',
    this.expression,
    ')'
  ].join('');
};
Expression.prototype.toString = function() {
  return  [ 'Expression():', displayText(this.expression) ].join(' ');
};

function Section(name, expression, content) {
  Template.call(this, true);
  if (name) {
    Object.defineProperty(this, 'name', { value:name });
    Object.defineProperty(this, 'expression', { value:expression.replace(/^\s*|\s*$/g,'').replace(/\;\s*$/g,'') });
    Object.defineProperty(this, 'content', { value:content });
  }
}
Section.prototype = new Template();
Section.prototype.parse = function(options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  try {
    vm.createScript('('+this.expression+')', this.name);
  } catch(ex) {
    if (!options.force) return callback(new Error(options.filename+'(Section:'+this.name+'): '+ex.message+'\n'+this.expression));
  }
  var that = this;
  parse(this.content, options, function(err, parts) {
    if (err) return callback(err);
    Object.defineProperty(that, 'parts', { value:parts });
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
  code.push('(function() {');
  code.push('  var '+this.name+'=('+this.expression+');');
  code.push('  '+this.name+'=(("undefined" === typeof '+this.name+') || ('+this.name+'===false) || ('+this.name+'===null))?[]:'+this.name+';');
  code.push('  '+this.name+'=_isarray_('+this.name+')?'+this.name+':['+this.name+'];');
  code.push('  return _join_(each('+this.name+', function('+this.name+', _index_, _list_) {');
  code.push('    return _join_([\n'+this.parts.map(function(part) { return part.code(lvl+1); }).join(',\n')+indent(lvl)+'\n]);');
  code.push('  }));');
  code.push('}.call(this))');
  return code.map(function(line) { return indent(lvl)+line; }).join('\n');
};
Section.prototype.toString = function() {
  return [ 'Section(', this.name, '): ', displayText(this.expression) ].join('');
};

function Partial(filename) {
  Template.call(this, true);
  if (filename) {
    Object.defineProperty(this, 'filename', { value:filename });
  }
}
Partial.prototype = new Template();
Partial.prototype.parse = function(options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var that = this;
  options = mergeOptions(options, { filename:options.filename ? path.resolve(path.dirname(options.filename), this.filename) : path.resolve(this.filename) });
  Object.defineProperty(this, 'fullpath', { value:options.filename });
  fs.readFile(this.fullpath, 'utf-8', function(err, text) {
    if (err) return callback(err);
    parse(text, options, function(err, parts) {
      if (err) return callback(err);
      Object.defineProperty(that, 'parts', { value:parts });
      return callback();
    });
  });
};
Partial.prototype.partials = function() {
  var result = [ this.fullpath ];
  this.parts.forEach(function(part) {
    result = result.concat(part.partials());
  });
  return result;
};
Partial.prototype.code = function(lvl) {
  var code = [];
  code.push('_join_([');
  code = code.concat(this.parts.map(function(part) { return indent(lvl+1)+part.code(); }).join(',\n'));
  code.push('])');
  return code.map(function(line) { return indent(lvl)+line; }).join('\n');
};
Partial.prototype.toString = function() {
  return [ 'Partial(', this.fullpath || this.filename, ')'].join('');
};

function cleanCode(code) {
  return [ '(', code.replace(/^\s*(?:\(\s*)|(?:\s*\))?\s*;?\s*$/g,''), ')' ].join('');
}

function Document(filename) {
  Partial.call(this, filename);
  if (filename) {
    this.makeCode = Partial.prototype.code;
  }
}
Document.prototype = new Partial();
Document.prototype.code = function(options) {
  options = mergeOptions(options);
  var result = [];
  result.push('(function(data) {');
  result.push('  function each(a,f) { var i,m=[]; for(i=0;i<a.length;i+=1) { m.push(f.call(a[i],a[i],i,a)); } return m; }');
  result.push('  function esc(t) { t=t+""; return t.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split(\'"\').join("&quot;"); }');
  result.push('  function _isarray_(a) { return (("object"===typeof a) && (null !== a) && (a.constructor === [].constructor)); }');
  result.push('  function _join_(a, c) { c=c||""; return _isarray_(a)?a.join(c):a; }');
  result.push('  var memo={}, root=data;');
  result.push('  return (function() {');
  result.push('    return '+this.makeCode(1)+';');
  result.push('  }.call(data));');
  result.push('});');
  result = result.join('\n');

  if (options.beautify) return cleanCode(result);

  result = UglifyJS.parse(result, { filename:'pistachio' });
  result.figure_out_scope();
  result.compute_char_frequency({});
  if (!options.beautify) result.mangle_names({});


  var stream = UglifyJS.OutputStream({});
  result.print(stream);

  return cleanCode(result);
};

function TextDocument(text) {
  Section.call(this, 'root', 'root', text);
  if (text) {
    this.makeCode = Section.prototype.code;
  }
}
TextDocument.prototype = new Section();
TextDocument.code = Document.prototype.code;

function parseFile(filename, options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var doc = new Document(filename);
  doc.parse(options, function(err) {
    if (err) return callback(err);
    return callback(undefined, doc);
  });
}
function parseText(content, options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  var doc = TextDocument(content);
  doc.parse(options, function(err) {
    if (err) return callback(err);
    return callback(undefined, doc);
  });
}
function parseTemplate(template, options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  template = String(template);
  fs.stat(template, function(err, stat) {
    ((err || !stat) ? parseText : parseFile)(template, options, callback);
  });
}

function compile(template, options, callback) {
  if (('function' === typeof options) && (!callback)) {
    callback = options;
    options = {};
  }
  if (template instanceof Template) {
    return process.nextTick(function() {
      return callback(undefined, template.code(options));
    });
  } else {
    parseTemplate(template, options, function(err, template) {
      if (err) return callback(err);
      return callback(undefined, template.code(options));
    });
  }
}
function compileTemplate(template, options, callback) {
  var result;
  if (template.indexOf('(function(') === 0) {
    try {
      result = vm.runInThisContext(code, String(template).split(/\r?\n/).shift());
    } catch(ex) {
      return process.nextTick(function() {
        callback(ex);
      });
    }
    return process.nextTick(function() {
      callback(undefined, result);
    });
  }
  compile(template, options, function(err, code) {
    if (err) return callback(err);
    try {
      result = vm.runInThisContext(code, String(template).split(/\r?\n/).shift());
    } catch(ex) {
      return callback(ex);
    }
    callback(undefined, result);
  });
}
