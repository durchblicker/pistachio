/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

(function() {
  var voidTags = ['area','base','br','col','command','embed','hr','img','input','keygen','link','meta','param','source','track','wbr'];

  try {
    if (('object' !== typeof module) || ('object' !== typeof module.exports)) throw('NOT CommonJS');
    return module.exports = compile;
  } catch(ex1) {
    try {
      if ('function' !== typeof define) throw('NOT AMD');
      define(function() { return compile; });
    } catch(ex2) {
      try {
        if ('function' !== typeof $) throw('NOT JQuery');
        return jQuerySetup($);
      } catch(ex3) {
        return mod;
      }
    }
  }
  function jQuerySetup($) {
    prop($, 'render', render);
    var templates={};
    
    function load(tpl) {
      tpl = String(tpl);

      var ctx = {};
      var obj = makeObj(ctx);

      // Is it cached
      if ('function' === typeof templates[tpl]) {
        return setTimeout(function() {
          ctx.complete(undefined, templates[tpl]);
        },0);
      }

      // Is it raw
      if (tpl.indexOf('<') > -1) {
        var err;
        try {
          tpl = compile(tpl);
        } catch (ex) {
          err = ex;
        }
        return setTimeout(function() {
          ctx.complete(err, tpl);
        });
      }

      // It is a url
      $.ajax(tpl).always(function(err, tpl) {
        if (err) return ctx.complete(err, tpl);
        try {
          templates[tpl] = tpl = tpl.match(/^\s*</)?compile(tpl):eval(tpl);
        } catch (ex) {
          err = ex;
        }
        ctx.complete(err, tpl);
      });

      return obj;
    }
    function render(tpl, data) {
      function doRender(ctx, tpl) {
        var val, err;
        try {
          val = tpl(data, data, 0, data);
        } catch(ex) {
          err = ex;
        }
        ctx.complete(err, val);
      }
      var ctx = {};
      var obj = makeObj(ctx);
      if ('function' !== typeof tpl) {
        load(tpl).done(bind(doRender, obj, ctx)).fail(ctx.complete);
      } else {
        setTimeout(bind(doRender, obj, ctx, tpl), 0);
      }
      return obj;
    }

    function makeObj(ctx) {
      var obj = {};
      ctx = ctx || {};
      ctx.done = (ctx.done && (ctx.done instanceof Array)) ? ctx.done : [];
      ctx.fail = (ctx.faile && (ctx.faile instanceof Array)) ? ctx.faile : [];
      ctx.always = (ctx.always && (ctx.always instanceof Array)) ? ctx.always : [];
      prop(obj, 'done', bind(done, obj, ctx));
      prop(obj, 'fail', bind(fail, obj, ctx));
      prop(obj, 'always', bind(always, obj, ctx));
      prop(ctx, 'complete', bind(complete, obj, ctx));
      return obj;
    }
    function done(ctx, fn) { ctx.done.push(fn); return this; }
    function fail(ctx, fn) { ctx.fail.push(fn); return this; }
    function always(ctx, fn) { ctx.always.push(fn); return this; }
    function complete(ctx, err, val) {
      if (err) {
        each(ctx.fail, function exec(fn) { fn(err); });
      } else {
        each(ctx.done, function exec(fn) { fn(val); });
      }
      each(ctx.always, function exec(fn) { fn(err, val); });
    }
  }

  function parse(text, opts) {
    opts = opts || {};
    opts.start = opts.start || '{{';
    opts.end = opts.end || '}}';
    text = String(text);
    if (text.substr(0, '(function'.length) === '(function') {
      var obj = {};
      obj.txt = text;
      obj.toString = bind(function() { return obj.txt; }, obj);
      return obj;
    }
    var stack = [];
    each(text.split('<'), function(part, idx) {
      if (!idx) return;
      part = part.split('>');
      var tag = part.shift();
      var rest = part.join('>');
      if (!opts.keepSpace) rest = rest.split(/(?:\s|\r|\n)+/).join(' ');
      if (tag[0] === '/') {
        tag = parseTag(tag.slice(1));
        var atZero = stack[0];
        while (stack.length && (stack[0].name != tag.name)) stack.shift();
        if (!stack.length) throw new Error('Malformed HTML: '+tag.name+' != '+atZero.name);
        if (stack.length > 1) {
          stack.shift();
          if (opts.keepSpace || (rest !== ' ')) stack[0].append(Text(rest, opts.start, opts.end));
        }
      } else {
        if (tag.substr(-1) === '/') {
          stack[0].append(parseTag(tag.substr(0,tag.length-1), opts.start, opts.end, opts.closeVoid));
          if (opts.keepSpace || (rest !== ' ')) stack[0].append(Text(rest, opts.start, opts.end));
        } else {
          tag = parseTag(tag, opts.start, opts.end, opts.closeVoid);
          if (voidTags.indexOf(tag.name)>-1) {
            stack[0].append(tag);
            if (opts.keepSpace || (rest !== ' ')) stack[0].append(Text(rest, opts.start, opts.end));
          } else {
            if (stack.length) {
              stack.unshift(tag);
              stack[1].append(stack[0]);
            } else {
              stack.unshift(tag);  
            }
            if (opts.keepSpace || (rest !== ' ')) stack[0].append(Text(rest,opts.start, opts.end));
          }
        } 

      }
    });
    stack = stack.pop();
    if ('function' == typeof opts.parsed) opts.parsed(stack);
    return stack;
  }
  function compile(tpl, opts) {
    tpl = String(tpl);
    tpl = (tpl.match(/^\s*</)) ? parse(tpl, opts).compile() : tpl; 
    var run = javascript(tpl);
    run.toString = function() {
      return tpl;
    };
    return run;
  }
  function javascript(template) {
    return eval(template);
  }

  function parseTag(tag, start, end, closeVoid) {
    tag = tag.replace(/^\s*|\s*$/g,'').split(' ');
    var name = tag.shift();
    var attr={};
    tag = tag.join(' ').replace(/(\S+?)="(.*?)"/g, function(match, name, value) { if (name && name.length) attr[name] = value; return ''; });
    each(tag.split(/\s+/), function(name) { if (name && name.length) attr[name] = name; });
    return Element(name, attr, start, end, closeVoid);
  }

  function bind(fn, obj) {
    var args = Array.prototype.slice.call(arguments, 2);
    try {
      return fn.bind.apply(fn, [obj].concat(args));
    } catch(ex) {
      return function bound() {
        return fn.apply(obj, args.concat(Array.prototype.slice.call(arguments)));
      };
    }
  }
  function prop(obj, name, value) {
    try {
      Object.defineProperty(obj, name, { value:value });
    } catch(ex) {
      obj[name]=value;
    }
  }
  function keys(obj) {
    try {
      return Object.keys(obj);
    } catch(ex) {
      var keys=[];
      var key;
      for (key in keys) {
        if (('function'!==typeof obj.hasOwnProperty) || obj.hasOwnProperty(key)) keys.push(key);
      }
      return keys;
    }
  }
  function each(arr, fn) {
    try {
      return arr.map(fn);
    } catch(ex) {
      var idx, map=[];
      for (idx=0; idx<arr.length; idx+=1) {
        map.push(fn.call(arr, arr[idx], idx, arr));
      }
      return map;
    }
  }
  function filter(arr, fn) {
    try {
      return arr.filter(fn);
    } catch(ex) {
      var idx, res=[];
      for (idx=0; idx<arr.length; idx+=1) {
        if (fn.call(arr, arr[idx], idx, arr)) res.push(arr[idx]);
      }
      return res;
    }
  }

  function stringify(txt) {
    return [
      '\'',
      txt.split('\\').join('\\\\').split('\'').join('\\\'').split('\r').join('\\r').split('\n').join('\\n'),
      '\''
    ].join('');
  }
  function value(value, start, end) {
    return each(String(value || '').split(start || '{{'), function(part, idx) {
      if (!idx) return stringify(part);
      return each(part.split(end || '}}'), function(part, idx) {
        if (!idx) return '('+part+')';
        return stringify(part);
      }).join('+');
    }).join('+');
  }


  function Element(name, attributes, start, end, closeVoid) {
    var obj = {};
    var ctx = {
      name:String(name).toLowerCase(),
      attributes:attributes||{},
      children:[],
      start:start,
      end:end,
      closeVoid:closeVoid
    };
    ctx.isVoid = (voidTags.indexOf(ctx.name) > -1);

    prop(obj, 'name', ctx.name);
    prop(obj, 'attribute', bind(attribute, obj, ctx));
    prop(obj, 'append', bind(append, obj, ctx));
    prop(obj, 'compile', bind(elementCompile, obj, ctx));

    return obj;
  }

  function attribute(ctx, name) {
    if (ctx.attributes[name] && !attributeFilter(name)) {
      return ctx.attributes[name].split('&lt;').join('<').split('&gt;').join('>').split('&quot;').join('"').split('&amp;').join('&');
    } else {
      return ctx.attributes[name];  
    }
  }
  function append(ctx, child) {
    if (ctx.isVoid) return this;
    ctx.children.push(child);
    return this;
  }
  
  function attributeFilter(name) {
    return ([
      'jtpl-if',
      'jtpl-each'
    ].indexOf(name) < 0);
  }
  function attributeString(ctx, name) {
    var result = [];
    result.push('(function attribute(root, data, idx) {');
    result.push('return ');
    result.push(stringify(name+'="')+'+');
    result.push(value(this[name], ctx.start, ctx.end));
    result.push('+'+stringify('"')+';');
    result.push('})');
    return result.join('');
  }
  function elementCompile(ctx, isChild, named) {
    if (named && (ctx.name==='jstpl')) {
      if (!named[ this.attribute('name') ]) throw new Error('Template not found: '+this.attribute('name'));
      return named[ this.attribute('name') ].compile(isChild, named);
    }
    var tag = [];
    var attr=filter(keys(ctx.attributes), attributeFilter);
    tag.push('(function startTag() { return '+stringify('<'+(ctx.name)+(attr.length?' ':(ctx.isVoid && ctx.closeVoid?'/>':'>')))+';})');
    tag = tag.concat(each(attr, bind(attributeString, ctx.attributes, ctx)));
    if (attr.length) tag.push('(function startTag() { return '+stringify(ctx.isVoid && ctx.closeVoid?'/>':'>')+'; })');
    tag = tag.concat(each(ctx.children, function(child) { return child.compile(true, named); }));
    if ((voidTags.indexOf(ctx.name)<0)) tag.push('(function endTag() { return '+stringify('</'+(ctx.name)+'>')+'; })');
    tag = tag.join(',\n');
    tag = each(tag.split('\n'), function(line) { return '    '+line; });
    var result = [];
    result.push('(function node(root, data, index, parent) {');
    if (!isChild) {
      result.push('  data = parent = root; index=0;');
      result.push('  function each(arr, fn) { var idx,map=[]; for (idx=0; idx<arr.length; idx+=1) map.push(fn(arr[idx],idx,arr)); return map; }');
    }
    if (this.attribute('jtpl-if')) result.push(('  if (!('+this.attribute('jtpl-if')+')) return \'\';'));
    result.push('  var selected=('+(this.attribute('jtpl-each') || 'data')+');');
    result.push('  if (\'undefined\'===typeof selected) return \'\';');
    result.push('  selected=(selected instanceof Array)?selected:[selected];');
    result.push('  if (!selected.length) return \'\';');
    result.push('  var tag = [');
    result = result.concat(tag);
    result.push('  ];');
    result.push('  return each(selected, function(childData, idx) {');
    result.push('    return each(tag, function(fn) {');
    result.push('      return fn(root, childData, idx, data);');
    result.push('    }).join(\'\');');
    result.push('  }).join(\'\');');
    result.push('})');
    //result = each(result.join('\n').split('\n'), function(line) { return indent+line; });
    return result.join('\n');
  }

  function Text(txt, start, end) {
    var obj = {};
    var ctx = { text:txt, start:start, end:end };
    prop(obj, 'name', 'TEXT' );
    prop(obj, 'compile', bind(textCompile, obj, ctx));
    return obj;
  }
  function textCompile(ctx) {
    return [
      '(function text(root, data, idx) { return ',
      value(ctx.text, ctx.start, ctx.end),
      '; })'
    ].join('');
  }  
}());
