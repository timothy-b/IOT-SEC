// ripped from https://stackoverflow.com/a/5957629/9179349

const http = require('http');

console.log('setting up server');
http.createServer(function(req,res){
  var header = req.headers['authorization']||'',        // get the header
      token = header.split(/\s+/).pop()||'',            // and the encoded auth token
      auth = new Buffer(token, 'base64').toString(),    // convert from base64
      parts = auth.split(/:/),                          // split on colon
      username = parts[0],
      password = parts[1];

  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end('username is "'+username+'" and password is "'+password+'"');

}).listen(1337,'localhost');


setTimeout(() => {
  const req = http.request(
    {
      host: "127.0.0.1",
      port: 1337,
      auth: "Alice:Wonderland"
    },
    (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });

    console.log("sending request");
    req.end();
  },
  1000
);
