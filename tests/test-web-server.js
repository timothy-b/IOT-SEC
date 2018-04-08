const http = require("http");

const html = `
<!DOCTYPE "html">
<html>
<head>
<title>Hello World Page</title>
</head>
<body>
Hello World!
</body>
</html>
`;

const server = http.createServer(function(request, response) {

	console.log("method: " + request.method);
	console.log("url: " + request.url);

	let body = "";
	request.on('readable', function() {
		body += request.read();
	});
	request.on('end', function() {
		console.log(body);
	});

	response.writeHead(200, {"Content-Type": "text/html"});
	response.write(html);
	response.end();

});

server.listen(80);
console.log("Server is listening");
