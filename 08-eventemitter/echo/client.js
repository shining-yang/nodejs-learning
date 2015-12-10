// client to access the echo server
//
var net = require('net');
var PORT = 9000;
var client = net.connect({
	port: PORT
}, function() {
	console.log('Connected to server.');
	process.stdin.resume();
	process.stdin.on('data', function(data) {
		client.write(data);
	});
});

client.on('data', function(data) {
	process.stdout.write(data);
});

client.on('end', function() {
	console.log('Disconnected from server.');
});

client.on('error', function(err) {
	console.log('Disconnected from server. ', err.code);
	client.destroy();
});
