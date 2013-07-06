# Pistachio [![Build Status](https://secure.travis-ci.org/phidelta/pistachio.png)](http://travis-ci.org/#!/phidelta/pistachio)

Pistachio is a pure JavaScript compiler that compiles [mustache](http://mustache.github.com/) templates to pure JavaScript functions. These JavaScript functions are self contained and can be run in any JavaScript environment to render a template (i.e.: in Browsers as well).

It was inspired by my personal search for a good templating system. I did find an abundance yet nothing that suited me. The closest to my liking was mustache, but it has some short commings that made it insufficient for me.

  The other ones I liked were
  * [hogan.js](https://github.com/twitter/hogan.js) which compiles mustache templates, but requires the hogan runtime to be present for rendering.
  * [doT](https://github.com/olado/doT) which compiles to pure JavaScript, but uses its own funky templating syntax.

So I decided to combine the two and inject some JavaScript steroids. I had to be nuts to create yet another templating system. Since my favorite nut is the pistachio (and it sounds like "pissed at staches" ;) ), that became the name of the project.

## Short Commings of Mustache

Mustache aims to be a logic-less templating system. Which is great in concept, since you really should separate your logic from your interface. While it is great in concept, some logic is often necessary, if only to decide which interface elements to display how.

This was also recognized by the mustache guys, which is why they came up with lambdas. Lambdas are functions that are present in the data to be rendered. They get the content in the lamdas section and are supposed to do with it whatever they will and return rendered content.

I think lamdas are a way "to shoot yourself in the foot with a crossbow". What I mean is that lamdas are powerful enough to hurt youself with, yet not powerful enough to fight a modern battle with.

So wanted/needed more power. So lambdas are not supported; I wanted to use actual JavaScript expressions in my templates. This is useful for example in Date and Number formatting, filtering lists, and much more.

## So what is pistachio?

Basically you can think of pistachio as mustache on JavaScript steroids. Pistachio is very similar to mustache in terms of syntax. In fact most any mustache template can be used as is with pistachio. Unless it contains tag switching you are good to go. Pistachio compiles that template into a plain JavaScript function that you can call in pretty much any JavaScript engine. So you can use the compiled template with NodeJS or in the browser. Heck you could even use the same template in both the browser and in your node server.

The first thing the compiler does is create a parse tree, that is basically a list of JavaScript expressions. That is then compiled into a single JavaScript function. This function is already pretty minified. If you want to reduce it even more and also remove anything that is not used in your template, then just run it through the Google Closure Compiler. (As a matter of fact you *SHOULD* do that!)

## Syntax

The syntax is basically mustache. There are a few additions, that make pistachio much more powerful. These are all triggered by beginning a mustache tag with {{#!;

The only syntax element that is currently not supported is *** {{=XX XX=}} *** to change the delimiters. However this is planned for the near future.

### Utility Functions

There are several utility function available in expressions (and section expressions).

 * *$escape(text)* - converts the argument to a string and does HTML escaping
 * *$each(array, function)* - is a cross browser capable version of *Array.prototype.map*
 * *$filter(array, function)* - is a cross browser capable version of *Array.prototype.filter*
 * *$keys(object)* - is a cross browser capable version of *Object.keys*
 * *$isarray(item)* - is a cross browser capable version of *Array.isArray*
 * *$array(item)* - is a cross browser capable version of $isarray(item)?item:[item]
 * *$join(array, char)* - is a cross browser capable version of $array(array).join(char||'')
 * *$strip(text)* - is a cross browser capable version of stripping whitespace between tags and converting multiple spaces into a single space

### Variables

The current data piece is alwas available as *this*. All previous section data is available under name of that section.

If you are rendering a section with a list-item (i.e.: the section's data is an Array), then you also have the variable *_index_* which contains the 0 based count of the current item in the list.

### Expressions

  {{#! expression }}

Expressions are just that. They are any valid JavaScript expression. The data that is supposed to be renderd is available in the *this* variable.

The mustache variable {{name}} will translate to {{#! $escape(this['name']) }} while {{{name}}} will map to {{#! this['name'] }}

**Example**

*Template*

    Hallo I am your {{#! this.name }} version {{#! this.version }} rendering engine!

*Data*

    { "name":"pistachio", "version":"0.1.0" }

As you can see, this is where your data is. The use of javascript expressions is quite powerful; remember even a function can be an expression ;)

### Sections

  {{#!name expression }}section-content{{/name}}}

Sections are pieces of the template that can contain expressions and other sections. Your entire template is nothing more than a section named *root*. A section has a name which is mandatory and used to provide a variable by that name to all elements in that section.

The expression that follows the name is taken as the *this* for all expressions and sections within this section and assigned to a variable with the name of the section.

The mustache section {{#name}}content{{/name}} wil basically map to {{#!name this['name'] }}content{{/name}}
The mustache section {{^name}}content{{/name}} wil map to {{#!name !this['name'] }}content{{/name }}

### Partials

Partials are the includes of templating. The filename is relative to the current template file.

  {{>filename}}

### Globs

Globs are Partials on steroids. You can use a glob to include multiple files

  {{#>glob}}

### Deltas

Deltas are like *stored procedures*. You give a section a name and it is then available for you to call on any expression. This also allows for recursion.

To define a Delta:

  {{##name}}content{{#/name}}

To call a Delta:

  {{##!name expression}}

### Rendering Rules

The rendering rules are pretty much the same as for regular mustache sections.

**The section is not rendered if:**

  * The expression yields *null*
  * The expression yields *undefined*
  * The expression yields *boolean false*
  * The expressuin yields an *array* with length 0

**The section is rendered *once* if:**

  * The expressions yields a *number*
  * The expression yields a *string* (even if it yields an empty string)
  * The expression yields a non *null* *object* (Except if the object is an Array)
  * The expression yields a *boolean true* except that the *this* and *parent* variables are not changed

**The section is rendered *more than once* if:**

  * The expression yields an *array* with a length > 0 (once for each element)

## Compiler

The package comes with a compiler. You can invoke it with:

    pistachio [<options>] <template-file>

The options available are:
  * *--out=&lt;filename>* The template is written to this file instead of *stdout*
  * *--render=data-file* use the template-file to render the *data-file* which needs to be JSON. (template may be compiled or uncompiled)
  * *--strip-space* remove multiple spaces from content by converting them to a single space
  * *--html* remove spaces between &gt and &lt; in addition to --strip

## Using the Templates

The compiled templates are plain JavaScript function that take the data as an argument and return the rendered text. Aisde from that there are client libraries included here that make these templates easy to use with:

 * jQuery in the browser
 * directly in Node.JS
 * with Express (using render)

For more Information there is [separate documentation](./clients/Readme.md)

## License (MIT)

Copyright (C) 2012 YOUSURE Tarifvergleich GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
