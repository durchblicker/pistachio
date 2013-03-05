/*
** © 2012 by YOUSURE Tarifvergleich GmbH. Licensed under MIT License
*/

(function($) {
  var cached = {};
  main.render = render;
  main.cache = cache;
  main.load = load;
  $['pistachio'] = main;
  $['fn']['pistachio'] = renderInto;

  function main(tpl, data, callback) {
    var ctx = {};
    var hdl = handle(ctx, callback);
    if(!tpl) {
      setTimeout(function() {
        ctx.complete(new Error('bad template specification'));
      }, 0);
      return hdl;
    }
    switch(typeof tpl) {
      case 'function':
        render(tpl, data, ctx.complete);
        break;
      case 'string':
        cache(tpl).fail(ctx.complete).done(function(tpl) {
          render(tpl, data).always(ctx.complete);
        });
        break;
      case 'object':
        if('string' !== typeof tpl.uri) {
          setTimeout(function() {
            ctx.complete(new Error('bad template uri'));
          }, 0);
          break;
        }
        if(tpl.cache) {
          main(tpl.uri, data, ctx.complete);
          break;
        }
        load(tpl.uri).fail(ctx.complete).done(function(tpl) {
          render(tpl, data, ctx.complete);
        });
        break;
      default:
        setTimeout(function() {
          ctx.complete(new Error('bad template specification'));
        }, 0);
    }
    return hdl;
  }

  function render(tpl, data, callback) {
    var ctx = {};
    var hdl = handle(ctx, callback);
    setTimeout(function() {
      try {
        data = tpl(data);
      } catch(err) {
        if(window.console && ('function' === typeof console.log)) console.log(err, err.message, err.stack);
        return ctx.complete(err);
      }
      ctx.complete(undefined, data);
    }, 0);
    return hdl;
  }

  function renderInto(tpl, data, callback) {
    var ctx = {
      nodes: this
    };
    var hdl = handle(ctx, callback);

    main(tpl, data).done(function(html) {
      ctx.node.each(function(node) {
        node = $(node);
        if(tpl.empty) node.empty();
        node.append(html);
      });
      ctx.complete(undefined, html, ctx.node);
    }).fail(ctx.complete);

    return hdl;
  }

  function cache(uri, callback) {
    var ctx = {};
    var hdl = handle(ctx, callback);
    uri = resolve(uri);
    if('function' === typeof cached[uri]) {
      setTimeout(function() {
        ctx.complete(undefined, cached[uri]);
      }, 0);
    } else {
      load(uri).fail(ctx.complete).done(function(tpl) {
        ctx.complete(undefined, cached[uri] = tpl);
      });
    }
    return hdl;
  }

  function load(uri, callback) {
    var ctx = {};
    var hdl = handle(ctx, callback);
    $.ajax(uri).fail(ctx.complete).done(function(txt) {
      try {
        txt = eval(txt);
        if('function' !== typeof txt) throw(new Error('bad template'));
      } catch(err) {
        err.code = txt;
        return ctx.complete(err);
      }
      ctx.complete(undefined, txt);
    });
    return hdl;
  }

  function resolve(uri) {
    var a = document.createElement('a');
    a.href = uri;
    return String(a.href);
  }

  function handle(ctx, callback) {
    ctx.done = [];
    ctx.fail = [];
    ctx.always = [];

    var obj = {};
    obj.done = function(fn) {
      if('function' === typeof fn) ctx.done.push(fn);
      return obj;
    };
    obj.fail = function(fn) {
      if('function' === typeof fn) ctx.fail.push(fn);
      return obj;
    };
    obj.always = function(fn) {
      if('function' === typeof fn) ctx.always.push(fn);
      return obj;
    };
    obj.always(callback);
    ctx.complete = function(err, val, aux) {
      var idx;
      if(err) {
        for(idx = 0; idx < ctx.fail.length; idx += 1) ctx.fail[idx](err);
      } else {
        for(idx = 0; idx < ctx.done.length; idx += 1) ctx.done[idx](val, aux);
      }
      for(idx = 0; idx < ctx.always.length; idx += 1) ctx.always[idx](err, val, aux);
    };
    return obj;
  }
}(jQuery));
