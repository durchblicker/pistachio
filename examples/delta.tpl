{{#>**/*.part}}
{{##test}}
<li>
  <a href="#">{{title}}</a>
  <ul>{{##!test test.children }}</ul>
</li>
{{#/test}}

<ul>
  {{##!test root }}
</ul>