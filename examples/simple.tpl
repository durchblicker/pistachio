  <body>
    <b>The site {{site}} operated by {{company}} has been made by these people:</b>
    <ul>
      {{#person}}<li>{{#! esc(person.name) }} (same as {{name}}) - {{#! esc(person.job) }} (same as {{#! esc(this.job) }})</li>{{/person}}
    </ul>
  </body>