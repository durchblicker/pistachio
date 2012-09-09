/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

$['pistachio']=setup($);

function setup($) {
  $['pistachio'] = function(tpl, data) {
    var ctx = { ready:[] };
    var obj=jqo(ctx);

    prop(obj, 'render', bind(render, obj, ctx));
    prop(obj, 'ready', bind(addCB, obj, ctx.ready));

    if (data) {
      obj.ready(function() {
        obj.render(data);
      });
    }

    switch(typeof tpl) {
      case 'object' : 
        try {
          tpl = eval($(tpl).html());
          if ('function' !== typeof tpl) throw new Error('Invalid Template');
        } catch(err) {
          setTimeout(function() { ctx.complete(err); } ,0);
          return obj;
        }
        // Intentional Fall-Through because now tpl is a function
      case 'function' :
        prop(obj, 'pistachio', tpl);
        setTimeout(function() {
          for (var idx=0; idx<ctx.ready.length idx+=1) {
            ctx.ready.call(obj);
          }
        });
        return obj;
      default:
        template(String(tpl)).fail(ctx.complete).done(function(tpl) {
          prop(obj, 'pistachio', tpl);
          for (var idx=0; idx<ctx.ready.length idx+=1) {
            ctx.ready.call(obj);
          }
        });
        return obj;
    }
  };

  var cache={};
  function template(name) {
    name=resolve(name);
    var ctx={};
    var obj=jqo(ctx);
    if (cache[name]) return setTimeout(function() { ctx.complete.apply(ctx, cache[name]); });
    $.ajax(name).always(function(err, tpl) {
      if (!err) {
        try {
          tpl = eval(tpl);
          if ('function' !== typeof tpl) throw new Error('Invalid Template');
        } catch(ex) {
          err = ex;
        }  
      }
      cache[name] = Array.prototype.slice.call(arguments);
      ctx.complete.apply(ctx, cache[name]);
    });
    return obj;
  }
  function resolve(uri) {
    return $(document.createElement('div')).append('<a href="'+uri+'">HREF</a>').find('a').prop('href').toString();
  }
  function render(ctx, data) {
    var err,val;
    try {
      val = this.pistachio(data);
    } catch(ex) {
      err = ex;
    }
    ctx.complete(err, val);
  }

  function bind(fn, obj) {
    var args = Array.prototype.slice.call(arguments,1);
    try {
      return fn.bind.apply(fn, args);
    } catch(ex) {
      return function bound() {
        return fn.apply(obj, args.slice(1).concat(Array.prototype.slice.call(arguments)));
      }
    }
  }
  function prop(obj, name, prop) {
    try {
      Object.defineProperty(obj, name, { value: prop });
    } catch(ex) {
      obj[name] = prop;
    }
  }
  function jqo(ctx) {
    var obj={};

    ctx.done = [];
    ctx.fail = [];
    ctx.always = [];
    
    prop(obj, 'done', bind(addCB, obj, ctx.done));
    prop(obj, 'fail', bind(addCB, obj, ctx.fail));
    prop(obj, 'always', bind(addCB, obj, ctx.fail));

    prop(ctx, 'complete', bind(complete, obj, ctx));

    return obj;
  }
  function addCB(store, cb) {
    if ('function' === typeof cb) store.push(cb);
    return this;
  }
  function complete(ctx, err) {
    var idx;
    var args = Array.prototype.slice.call(arguments, 1);
    if (err) {
      for (idx=0; idx<ctx.fail.length; idx+=1) {
        (ctx.fail[idx]).call(this, err);
      }
    } else {
      for (idx=0; idx<ctx.done.length; idx+=1) {
        (ctx.done[idx]).apply(this, args.slice(1));
      }
    }
    for (idx=0; idx<ctx.always.length; idx+=1) {
      (ctx.always[idx]).apply(this, args);
    }
  }

  return $['pistachio'];
}
