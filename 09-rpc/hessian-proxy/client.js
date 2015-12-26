// RPC client using hessian-proxy
var Proxy = require('hessian-proxy').Proxy;
var server = 'http://192.168.0.221:81/QcrlErp/remote/venueService';
var username = '';
var password = '';
var proxy = new Proxy(server, username, password, proxy);

var proc = 'queryVenueById';
var arg = JSON.stringify({
  id: 4103
});

var myArg = '{id:4103}';

proxy.invoke(proc, [myArg], function(err, reply) {
  if (err) {
    console.log('Error: ', err.toString());
  } else {
    console.log('Reply data length: ', reply.length);
    console.log(reply);
  }
});
