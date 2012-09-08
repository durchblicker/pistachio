/*
** © YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

module.exports = compile;
module.exports.parse = parse;

function varnameString(name) {
  return "'"+name.split("'").join("\\'")+"'";
}
function stringExpression(text) {
  return "'"+text.split('\\').join('\\\\').split("'").join("\\'").split('\r/').join('\\r').split('\n').join('\\n').+"'";
}

function mustacheReplaceVariables(text) {
  return text.replace(mustacheReplaceVariables.comment, '').replace(mustacheReplaceVariables.partial, function(match, name) {
    return '[[> '+name+' ]]';
  }).replace(mustacheReplaceVariables.tripple, function trippleStache(match, name) {
    return '[[ this['+varnameString(name)+'] ]]';
  }).replace(mustacheReplaceVariables.double, function doubleStache(match, variable) {
    return '[[ esc(this['+varnameString(name)+']) ]]';
  });
}
mustacheReplaceVariables.tripple=(/\{\{\{\s*(\w+?)\s*\}\}\}/g);
mustacheReplaceVariables.double=(/\{\{\s*(\w+?)\}\}/g);
mustacheReplaceVariables.comment=(/\{\{\!.*?\}\}/g);
mustacheReplaceVariables.partial=(/\{\{\>.*?\}\}/g);

function mustacheReplaceSections(text) {
  return text.replace(mustacheReplaceSections.positive, function(match, name, content) {
    name=varnameString(name);
    return '[[['+name+' this['+varnameString(name)+'] ]]]'+content+'[[[/'+name+']]]';
  }).replace(mustacheReplaceSections.positive, function(match, name, content) {
    name=varnameString(name);
    return '[[['+name+' !this['+varnameString(name)+'] ]]]'+content+'[[[/'+name+']]]';
  });
}
mustacheReplaceSections.positive=(/\{\{#(\w+?)\}\}(.*?)\{\{\/\1\}\}/g);
mustacheReplaceSections.negative=(/\{\{\^(\w+?)\}\}(.*?)\{\{\/\1\}\}/g);

function parse(text, opts, name, select) {
  var expr=[];
  if (!opts.shaved) {
    text = mustacheReplaceSections(text);
    text = mustacheReplaceVariables(text);  
  }
  while (text.indexOf(parse.splitToken) > -1) parse.splitToken+=parse.splitToken;
  text = text.replace(parse.section, function(match, name, data, content) {
    expr.push(parse(content, opts, name, select));
    return parse.splitToken;
  }).replace(parse.partial, function(match, name) {
    if (!opts.partials) throw new Error('Template contains a partial, but no partials are passed!');
    var partial;
    if ('function' == typeof opts.partials) {
      partial = opts.partials(name);
    } else {
      partial = opts.partials[name];
    }
    if (!partial || ('object' !== typeof partial)) throw new Error('Template contains partial "'+name+'", but no valid partial was returned!');
    expr.push(partial);
    return parse.splitToken;
  }).replace(parse.expression, function(match, data) {
    expr.push('('+data+')');
    return parse.splitToken;
  });

  text = text.split(parse.splitToken);
  var content=[];
  while (text.length) {
    content.push(stringExpression(text.shift()));
    content.push(expr.shift());
  }

  return exprObj(content, opts, name, select);
}
parse.section=(/\[\[\[\s+(\w+?)\s+(?:(.*?)\s+)\]\]\](.*?)\[\[\[\s*\1\s*\]\]\]/g);
parse.expression(/\[\[\s*(.*?)\s*\]\]/g);
parse.partial(/\[\[\>\s*(.*?)\s*\]\]/g);
parse.splitToken = '\0<<\0>>\0';

function exprObj(content, opts, name, select) {
  var obj={};
  Object.defineProperty(obj, 'content', { value:content });
  Object.defineProperty(obj, 'name', { value:name });
  Object.defineProperty(obj, 'select', { value:select });
  Object.defineProperty(obj, 'toString', { value:exprObjString.bind(obj, opts); });
  return obj;
}
function cleanLine(line) { return line.replace(/^\s*|\s*$/g,''); }
function exprObjString(obj, opts) {
  var content = obj.content.map(function(item) { return item.toString(); });
  var text = [];
  text.push('(function '+(opts.name || '')+'(root, grandparent) {');
  text.push('  var parent=this;');
  text.push('  var data = '+(obj.select?('('+obj.select+')'):'this')+';');
  text.push('  if ("function" === typeof data) data = data(this, root, grandparent);');
  text.push('  if (("undefined" === typeof data) || (data === false) || (data === null)) return "";');
  text.push('  if (data===true) { data=this; parent=grandparent; }')
  text.push('  if (!Array.isArray(data) data=[data];');
  text.push('  if (!data.length) return "";');
  text.push('  return each(data, function(data) {');
  text.push('    (function(root, parent) {');
  text.push('      return '+content.join('+'));
  text.push('    }.call(data, root, parent))');
  text.push('  }).join("");')
  text.push('}.call(this, root, parent))');
  return text.map(cleanLine).join('');
}

function compileParsed(tree) {
  var text = [];
  text.push('(function(data) {');
  text.push('  function each(a,f) { var i,m=[]; for(i=0;i<arr.length;i+=1) { m.push(f(a[i],i,a)) } return m }');
  text.push('  function esc(t) { t=t+""; return t.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split(\'"\').join("&quot;") }');
  text.push('  var memo={};');
  text.push('  return (function(root, parent) {');
  text.push('    '+tree.toString());
  text.push('  }.call(data, data, data))');  
  text.push('})');
  return text.map(cleanLine).join('');
}

function compile(text, opts) {
  return compileParsed(parseJTPL(text, opts));
}
