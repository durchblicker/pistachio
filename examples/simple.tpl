  <body>
    <b>The site {{site}} operated by {{company}} has been made by these people:</b>
    <ul>
      {{#person}}<li>{{#! $escape(person.name) }} (same as {{name}}) - {{#! $escape(person.job) }} (same as {{#! $escape(this.job) }})</li>{{/person}}
    </ul>
  </body>