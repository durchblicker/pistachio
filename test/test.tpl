<html>
  <head>
    <title>((data.name))</title>
    <link rel="stylesheet" type="text/css" href="/styles.css" />
    <script type="text/javascript" src="/scripts.js"/>
  </head>
  <body>
    <h1 class="type-((data.type))">Hallo (( data.gender=='male'?'Lieber':'Liebe' )) (( data.name ))</h1>
    <b>You are (( data.age )) years old</b>
    <ul jtpl-if="data.friends &amp;&amp; data.friends.length">
      <li jtpl-each="data.friends">Friend: (( data.name ))</li>
    </ul>
    <ul>
      <li jtpl-each="Object.keys(data).map(function(key) { return { name:key, value:data[key] } })"><pre>(( JSON.stringify(data, undefined, '  ') ))</pre></li>
    </ul>
  </body>
</html>
