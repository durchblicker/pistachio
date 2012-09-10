/*
** © YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

var lineBreaks = true;

module.exports = compile;
module.exports.parse = parse;
module.exports.compile = compileParsed;

/*
** Mustache Parser
*/
function parse(text, options) {
  var expr=[];
  var content = text.split(parse.marker.frame).join('');
  content = content.replace(parse.plainSection, function(match, name, content) {
    expr.push(plainSection(name, content, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.notSection, function(match, name, content) {
    expr.push(notSection(name, content, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.bangSection, function(match, name, expression, content) {
    expr.push(bangSection(name, expression, content, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.partial, function(match, name) {
    expr.push(partial(name, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.trippleExpression, function(match, expression) {
    expr.push(trippleExpression(expression, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.bangExpression, function(match, name, expression) {
    expr.push(bangExpression(name, expression, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.unescapedExpression, function(match, expression) {
    expr.push(unescapedExpression(expression, options));
    return parse.marker(expr.length - 1);
  });
  content = content.replace(parse.plainExpression, function(match, expression) {
    expr.push(plainExpression(expression, options));
    return parse.marker(expr.length - 1);
  });

  content = content.split(parse.marker.frame).map(function jumbleTogether(item, idx) {
    return (idx % 2) ? expr[parseInt(item,10)] : stringExpression(item, options);
  });

  //console.error(content);
  var obj={};
  var ctx={ type:'document', name:'root', expression:'this', content:text, parsed:content, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'parsed', { value:content, enumerable:true });
  Object.defineProperty(obj, 'string', { get:bangSection.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:bangSection.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });
  return obj;
}
parse.marker=function(item) { return [ parse.marker.frame, item, parse.marker.frame ].join(''); };
parse.marker.frame='\0\0';

parse.plainSection=(/\{\{\#(?=[^\!])(\S+?)\}\}((?:\s|\S)*?)\{\{\/\1\}\}/g);
parse.notSection=(/\{\{\^(?=[^\!])(\S+?)\}\}((?:\s|\S)*?)\{\{\/\1\}\}/g);
parse.bangSection=(/\{\{\#\!(\S+?)\s+((?:\s|\S)+?)\s*\}\}((?:\s|\S)*)\{\{\/\s*\1\s*\}\}/g);
parse.partial=(/\{\{\>((?:\s|\S)*?)\}\}/g);

parse.trippleExpression=(/\{\{\{((?:\s|\S)+)\}\}\}/g);
parse.bangExpression=(/\{\{\#\!\s*((?:\s|\S)+?)\s*\}\}/g);
parse.unescapedExpression=(/\{\{\&((?:\S)+?)\}\}/g);
parse.plainExpression=(/\{\{(?=[^\#|\&])((?:\S)+?)\}\}/g);

parse.comment=(/\{\{\!(?:\s|\S)+\}\}/g);

function stripSpace(line) {
  return lineBreaks?line:line.replace(/^\s*|\s*$/g,'');
}
function stringify(expression) {
  var result = expression.split('\\').join('\\\\');
  result = result.split("'").join("\\'");
  result = result.split('\r').join('\\r');
  result = result.split('\n').join('\\n');
  result = result.split('\f').join('\\f');
  result = result.split('\t').join('\\t');
  return [ "'", result, "'" ].join('');
}
function toString() {
  return this.string;
}
function toTree(ctx, indent) {
  indent = indent || '';
  var res = indent+this.type+'('+this.string.split(/\r|\n|\f|\t/).join(' ').substr(0,75)+')\n';
  if (this.parsed) {
    this.parsed.forEach(function(item) {
      res+=item.toTree(indent+'  ');
    });
  }
  return res;
}

function plainSection(name, content, options) {
  var obj={};
  var ctx = { type:'plainSection', name:name, content:content, options:options };
  ctx.parsed = parse(ctx.content, ctx.options).parsed;

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'parsed', { value:ctx.parsed, enumerable:true });
  Object.defineProperty(obj, 'string', { get:plainSection.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:plainSection.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
plainSection.toString = function(ctx) {
  return '{{#'+ctx.name+'}}'+ctx.content+'{{/'+ctx.name+'}}';
}
plainSection.toCode= function(ctx) {
  var code=[];
  code.push('(function(_lambda_){');
  code.push('  var '+ctx.name+'=(this['+stringify(ctx.name)+']);');
  code.push('  '+ctx.name+'=(("undefined" === typeof '+ctx.name+') || ('+ctx.name+'===false) || (!_lambda_ && ('+ctx.name+'===null)))?[]:'+ctx.name+';');
  code.push('  '+ctx.name+'=Array.isArray('+ctx.name+')?'+ctx.name+':['+ctx.name+'];');
  code.push('  return (_lambda_?("{{#'+ctx.name+'}}"):"")+each('+ctx.name+', function('+ctx.name+') {');
  code.push('    return (function(_lambda_) {');
  code.push('      return '+ctx.parsed.map(function(item) { return item.code }).join('+'));
  code.push('    }.call('+ctx.name+',_lambda_ || ("function" === typeof '+ctx.name+')));');
  code.push('  }).join("")+(_lambda_?("{{/'+ctx.name+'}}"):"");');
  code.push('}.call(this, _lambda_))');
  return code.map(stripSpace).join(lineBreaks?'\n':'');
}

function notSection(name, content, options) {
  var obj={};
  var ctx = { type:'notSection', name:name, content:content, options:options };
  ctx.parsed = parse(ctx.content, ctx.options).parsed;

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'parsed', { value:ctx.parsed, enumerable:true });
  Object.defineProperty(obj, 'string', { get:notSection.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:notSection.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
notSection.toString = function(ctx) {
  return '{{^'+ctx.name+'}}'+ctx.content+'{{/'+ctx.name+'}}';
}
notSection.toCode= function(ctx) {
  var code=[];
  code.push('(function(_lambda_){');
  code.push('  var '+ctx.name+'=_lambda_?null:!(this['+stringify(ctx.name)+']);');
  code.push('  if (!_lambda_ && !'+ctx.name+') return "";');
  code.push('  '+ctx.name+'=_lambda_?[null]:[false];');
  code.push('  return (_lambda_?("{{^'+ctx.name+'}}"):"")+each('+ctx.name+', function('+ctx.name+') {');
  code.push('    return (function(_lambda_) {');
  code.push('      return '+ctx.parsed.map(function(item) { return item.code }).join('+'));
  code.push('    }.call('+ctx.name+',_lambda_));');
  code.push('  )}).join("")+(_lambda_?("{{/'+ctx.name+'}}"):"");');
  code.push('}.call(this, _lambda_))');
  return code.map(stripSpace).join(lineBreaks?'\n':'');
}

function bangSection(name, expression, content, options) {
  var obj={};
  var ctx = { type:'bangSection', name:name, expression:expression, content:content, options:options };
  ctx.parsed = parse(ctx.content, ctx.options).parsed;

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'parsed', { value:ctx.parsed, enumerable:true });
  Object.defineProperty(obj, 'string', { get:bangSection.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:bangSection.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
bangSection.toString = function(ctx) {
  return '{{#!'+ctx.name+' '+ctx.expression+'}}'+ctx.content+'{{/'+ctx.name+'}}';
}
bangSection.toCode= function(ctx) {
  var code = [];
  code.push('(function(_lambda_) {');
  code.push('  var '+ctx.name+'=_lambda_?null:('+ctx.expression+');');
  code.push('  '+ctx.name+'=(("undefined" === typeof '+ctx.name+') || ('+ctx.name+'===false) || (!_lambda_ && ('+ctx.name+'===null)))?[]:'+ctx.name+';');
  code.push('  '+ctx.name+'=Array.isArray('+ctx.name+')?'+ctx.name+':['+ctx.name+'];');
  code.push('  return (_lambda_?("{{#!'+ctx.name+'}}"):"")+each('+ctx.name+', function('+ctx.name+') {');
  code.push('    return (function(_lambda_) {');
  code.push('      return '+ctx.parsed.map(function(item) { return item.code }).join('+'));
  code.push('    }.call('+ctx.name+',_lambda_));');
  code.push('  }).join("")+(_lambda_?("{{/'+ctx.name+'}}"):"");');
  code.push('}.call(this, _lambda_))');
  return code.map(stripSpace).join(lineBreaks?'\n':'');
}

function partial(name, options) {
  var obj={};
  var ctx = { type:'partial', name:name, options:options };
  ctx.content = options.partials(ctx.name, ctx.options);
  ctx.parsed = ctx.content.parsed;

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'parsed', { value:ctx.parsed, enumerable:true });
  Object.defineProperty(obj, 'string', { get:partial.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:partial.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
partial.toString = function(ctx) {
  return '{{>'+ctx.name+'}}'
}
partial.toCode= function(ctx) {
  return '(function(_lambda_){ return _lambda_?("{{>"+'+stringify(ctx.name)+'+"}}"):('+this.code+') }.call(this,_lambda_))';
}

function trippleExpression(expression, options) {
  var obj={};
  var ctx = { type:'trippleExpression', expression:expression, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'string', { get:trippleExpression.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:trippleExpression.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
trippleExpression.toString = function(ctx) {
  return '{{{'+ctx.expression+'}}}';
}
trippleExpression.toCode= function(ctx) {
  return '(function(_lambda_){var e='+stringify(ctx.expression)+';return _lambda_?e:this[e]}call(this,_lambda_))';
}

function bangExpression(name, expression, options) {
  var obj={};
  var ctx={ type:'bangExpression', name:name, expression:expression, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'string', { get:bangExpression.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:bangExpression.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
bangExpression.toString = function(ctx) {
  return '{{#!'+name+' '+ctx.expression+'}}';
}
bangExpression.toCode= function(ctx) {
  return '(function(_lambda_){var e='+stringify(ctx.expression)+';return _lambda_?e:eval(e)}.call(this,_lambda_))';
}

function unescapedExpression(expression, options) {
  var obj={};
  var ctx={ type:'unescapedExpression', expression:expression, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'string', { get:unescapedExpression.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:unescapedExpression.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
unescapedExpression.toString = function(ctx) {
  return '{{&'+ctx.expression+'}}';
}
unescapedExpression.toCode= function(ctx) {
  return '(function(_lambda_){var e='+stringify(ctx.expression)+';return _lambda_?e:this[e]}.call(this,_lambda_))';
}

function plainExpression(expression, options) {
  var obj={};
  var ctx={ type:'plainExpression', expression:expression, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'string', { get:plainExpression.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:plainExpression.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
plainExpression.toString = function(ctx) {
  return '{{'+ctx.expression+'}}';
}
plainExpression.toCode= function(ctx) {
  return '(function(_lambda_){var e='+stringify(ctx.expression)+';return _lambda_?e:(esc(this[e])||"")}.call(this,_lambda_))';
}

function stringExpression(expression, options) {
  var obj={};
  var ctx={ type:'stringExpression', expression:expression, options:options };

  Object.defineProperty(obj, 'type', { value:ctx.type, enumerable:true });
  Object.defineProperty(obj, 'toTree', { value:toTree.bind(obj,ctx), enumerable:true });
  Object.defineProperty(obj, 'string', { get:stringExpression.toString.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'code', { get:stringExpression.toCode.bind(obj, ctx), enumerable:true });
  Object.defineProperty(obj, 'toString', { value:toString.bind(obj), enumerable:true });

  return obj;
}
stringExpression.toString = function(ctx) {
  return ctx.expression;
}
stringExpression.toCode= function(ctx) {
  return "'"+ctx.expression.split('\\').join('\\\\').split('\t').join('\\t').split('\n').join('\\n').split('\r').join('\\r').split('\f').join('\\f').split("'").join("\\'")+"'";
}

/*
** Function Compiler
*/

function compileParsed(tree) {
  var code = [];
  code.push('(function(data) {');
  code.push('  function each(a,f) { var i,m=[]; for(i=0;i<a.length;i+=1) { m.push(f(a[i],i,a)) } return m }');
  code.push('  function esc(t) { t=t+""; return t.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split(\'"\').join("&quot;") }');
  code.push('  var memo={}, root=data;');
  code.push('  return (function(_lambda_) {');
    console.log(tree.toTree());
  code.push('    return '+tree.code);
  code.push('  }.call(data, false))');
  code.push('})');
  return code.map(stripSpace).join(lineBreaks?'\n':'');
}
function compile(text, options) {
  return compileParsed(parse(text, options));
}
