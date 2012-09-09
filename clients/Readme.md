# Pistachio Template Usage

> ***In order to use a pistachio template you have to compile it first. When this documentation speaks of a template, it refers to the compiled state of the template.***

## Plain JavaScript

The compiled templates are plain JavaScript function expressions. You can load and use them in multiple ways. Either you copy & paste them into your code directly, or you ask the compiler to create an AMD or CommonJS module for you. Alternatively you can load them from a file and eval the contents.

**Copy & Paste Example:**

    var template=(function... // Copy & Paste

**AMD Example:**

    requirejs('mytemplate',function(template {
      var html = template(data);
    }));

**CommonJS Example:**

    var template = require('mytemplate');
    var html = template(data);

**Eval Example**

    <script type="text/pistachio" id="mytemplate">(function...</script>

    <script type="text/javascript">
      var template = eval(document.getElementById('#mytemplate').text);
      var html = template(data);
    </script>

## jQuery

In addition to the generic methods above there is a jQuery Plugin. You can ask the compiler to produce the file for you by calling:

    pistachio --jquery --out /path/to/the/place/where/you/want/the/file/pistachio.js

Of course you can also render the jQuery plugin as an AMD or CommonJS module. Alternatively you can simply use the *jquery.js* in this directory.

Once the plugin is included you can use it via:

    $pistachio(template-url, data).done(function(html) {
      ...
    });
    $pistachio(template-text, data).done(function(html) {
      ...
    });
    $pistachio(template-function, data)..done(function(html) {
      ...
    });

if you simply want a template object that you want to reuse, then don't pass in *data*

    var template = $pistachio(template-url).done(function(html) {
      ...
    }).ready(function() {
      // Now your template is ready
      template.render(data); // Will call your done handler (or fail handler) for every time you call render
    });

of course this also works with a template text or or a template function and not just a URL.

## Node.JS

To use the templates in Node.JS you can always use the generic ways. However you can also do:

    var pistachio = require('pistachio');

    pistachio(filename, function(err, html) {});

alternatively you can do:

    var pistachio = require('pistachio');
    fs.readFile(filename, function(err, text) {
      pistachio(eval(text), function(err, html) {});
    }, 'utf-8');
    
or one more option:

    var pistachio = require('pistachio');
    fs.readFile(filename, function(err, text) {
      pistachio.text(text, function(err, html) {});
    }, 'utf-8');

So basically whatever your style it is supported.

## Express

If you want to be less raw than the generic NodeJS stuff and you want to use pistachio with the [Express Framework](http://expressjs.com), pistachio provides a renderer middleware.

    app.engine('pistachio', require('pistachio').__express);
    ...
    var options = {
      root:"/path/to/the/document-root",        // the path passed to render() as a first argument will be resolved against this,
      template:'/path/to/teplate-file',         // this can be a filename, a string with the template or the function expression
      defaultTemplate:'/path/to /template-file' // if you want the file to provide a template in *data.pistachio* and only use the template from options when none is specified.
    };
    res.render('test.pistachio', options, function(err, html) {
      ... 
    });

In addition to passing the template via options, its filename can be specified in *data.pistachio* of the JSON data object at *path*.

Whatever way you pass in the template, when the callback is called, *options.template* will be the evaluated template function. This way you can create an options object at the beginning that contains the filename of the template and resuse it for all *res.render* calls that should use that template and the template remains there cached.
