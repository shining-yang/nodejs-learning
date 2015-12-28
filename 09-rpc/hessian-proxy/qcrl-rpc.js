//
var Proxy = require('hessian-proxy').Proxy;
var server = 'http://192.168.0.221:81/QcrlErp/remote/venueService';
var username = '';
var password = '';
var proxy = new Proxy(server, username, password, proxy);

proxy.on('reply', function(reply) {
  console.log(reply.toString());
});

proxy.on('error', function(err) {
  console.log('Proxy error: ', err);
});

exports.call = function(method, args, cb) {
  proxy.invoke(method, args, cb);
};