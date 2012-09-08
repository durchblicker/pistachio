# Pistachio

Pistachio is a pure JavaScript templating system whose compiled templates can be used both on the server as well an in the browser. It was inspired by my personal search for a good templating system. I did find an abundance yet nothing that suited me. The closest to my liking was mustache, but it has some short commings, that made it unsuitable for me. I had to be nuts to create yet another templating system. Since my favorite nut is the pistachio, that became the name of the project.

## Short Commings of Mustache

Mustache aims to be a logic-less templating system. Which is great in concept, since you really should separate your logic from your interface. While it is great in concept, some logic is often necessary, if only to decide which interface elements to display how.

This was also recognized by the mustache guys, which is why they came up with lambdas. Lambdas are functions that are present in the data to be rendered. They get the content in the lamdas section and are supposed to do with it whatever they will and return rendered content.

I think lamdas are a way "to shoot yourself in the foot with a crossbow". What I mean is that lamdas are powerful enough to hurt youself with, yet not powerful enough to fight a modern battle with.

## So what is pistachio?

Basically you can think of pistachio as mustache on JavaScript steroids. Pistachio is very similar to mustache in terms of syntax. In fact most any mustache template can be used as is with pistachio. Unless it contains lambdas you are good to go. Pistachio compiles that template into a plain JavaScript function that you can call in pretty much any JavaScript engine. So you can use the compiled template with NodeJS or in the browser. Heck you could even use the same template in both the browser and in your node server.

The first thing the compiler does is replace all mustache tags with their pistachio equivalents before parsing. Then a parse tree is built that is basically a list of JavaScript expressions. That is then compiled into a single JavaScript function. This function is already pretty minified. If you want to reduce it even more and also remove anything that is not used in your template, then just run it through the Google Closure Compiler.

## Syntax

### Utility Functions

There are two utility function available in expressions (and section expressions).

 * *esc(text)* - converts the argument to a string and does HTML escaping
 * *each(array, function) - is a cross browser capable version of *Array.prototype.map*

### Variables

There are several variables available in expressions (and section expressions).

 * *this* : the current piece of data to be rendered
 * *root* : the root data object (the one you called the main function on)
 * *parent* : the this of your parent section
 * *memo* : initally an empty object. It is a scratch-pad that all expressions can use to pass information between expressions

### Expressions

  [[ expression ]]

Expressions are just that. They are any valid JavaScript expression. The data that is supposed to be renderd is available in the *this* variable. In addition you have the following variables available:



The mustache variable {{name}} will translate to [[ esc(this['name']) ]] while {{{name}}} will map to [[ this['name'] ]]

**Example**

*Template*

    Hallo I am your [[ this.name ]] version [[ this.version ]] rendering engine!

*Data*

    { "name":"pistachio", "version":"0.1.0" }

As you can see, this is where your data is.

### Sections

  [[[name expression ]]]section-content[[[name]]]

Sections are pieces of the template that can contain expressions and other sections. Your entire template is nothing more than a section. A section has a name. While a name is mandatory it is not used for anything other than to make sure that the opening and closing tags of the section match.

The expression that follows the name is taken as the *this* for all expressions and sections within this section.

The mustache section {{#name}}content{{/name}} wil map to [[[name this['name'] ]]]content[[[name]]]
The mustache section {{^name}}content{{/name}} wil map to [[[name !this['name'] ]]]content[[[name]]]

The section will be rendered 0 or more times depending on the value it results in:

The template is not rendered if:

  * The expression yields *null*
  * The expression yields *undefined*
  * The expression yields *boolean false*
  * The expressuin yields an *array* with length 0

The template is rendered **once** if:

  * The expressions yields a *number*
  * The expression yields a *string* (even if it yields an empty string)
  * The expression yields a non *null* *object* (Except if the object is an Array)
  * The expression yields a *boolean true* except that the *this* and *parent* variables are not changed

The template is rendered **more than once** if:

  * The expression yields an *array* with a length > 0 (once for each element)

If the expression yields a *function* it is called with the arguments *this*, *root*, *parent*. Then the above rules are plied to the result of the function.

### Partials

[[> name ]]  Mustache {{>name}} is synonymous

Partials are basically templates included from elsewhere into the template at a specific point. The pistachio compiler will load partials from the file named relative to the current template file (or cwd if using stdin)

### Mustache Lambdas

There is limited mustache lambda support. Since the template is fully compiled before ever being rendered, lamdas have to be declared at compiletime. If you pass the compiler the name of your lambda with the --lamda option, that mustache section will be treated as a mustache lambda if the data is actually a function. If the data is not a function an empty string is inserted instead of the section.

## Compiler

The package comes with a compiler. You can invoke it with:

    pistachio [<options>] <template-file>

The options available are:

  * *--shaved* Do not interpret mustache tags. Just ignore them.
  * *--lambda=&lt;name>* These mustache sections are lambdas (this option can be passed multiple times).
  * *--out=&lt;filename>* The template is written to this file instead of *stdout*
  * *--amd* wrap the result in an amd module *define* (Not available with *--common*)
  * *--common* make the result a valid CommonJS module (`module.exports=(function() {})`) (Not available with *--amd*)
  * *--prepend=&lt;string>* prepend the result with the string (Not available with *--amd* or *--common*)
  * *--append=&lt;string>* append the string to the end of the result (Not available with *--amd* or *--common*)

## License (MIT)

Copyright (C) 2012 YOUSURE Tarifvergleich GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
