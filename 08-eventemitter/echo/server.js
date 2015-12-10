//
// Simple echo server
//
var net = require('net');
var PORT = 9000;

var server = net.createServer(function(socket) {
	var remoteAddress = socket.remoteAddress;
	var remotePort = socket.remotePort;

	console.log('Client connected: ', remoteAddress + ':' + remotePort);
	socket.write('Welcome this echo server.\r\n');
	socket.write(Date().toString() + '\r\n');

	socket.on('data', function(data) {
		socket.write(data);
	});

	socket.on('end', function() {
		console.log('Client disconnected: ', remoteAddress + ':' + remotePort);
	});

	socket.on('error', function(err) {
		console.log('Client disconnected: ', remoteAddress + ':' + remotePort, ' ', err.code);
		socket.destroy();
	});
});

server.listen(PORT, function() {
	console.log('Server started.');
});

server.on('error', function(err) {
	if (err.code === 'EADDRINUSE') {
		console.log('Server address is already in use, try again ...');
		setTimeout(function() {
			server.close();
			server.listen(PORT);
		}, 3000);
	}
});


