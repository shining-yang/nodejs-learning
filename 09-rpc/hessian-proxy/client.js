// RPC client using hessian-proxy
var util = require('util');
var Proxy = require('hessian-proxy').Proxy;
var server = 'http://192.168.0.221:81/QcrlErp/remote/venueService';
var username = '';
var password = '';
var proxy = new Proxy(server, username, password, proxy);

proxy.on('call', function(data) {
  console.log('CALL: ', data.length, ' ', data);
});

proxy.on('reply', function(data) {
  console.log('REPLY: ', data.length, ' ', data);
});

var proc = 'queryVenueById';//'queryVenueAccountById';
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
    //console.log(JSON.parse(reply));
    console.log(util.inspect(JSON.parse(reply)));
    console.log(JSON.stringify(JSON.parse(reply)));
  }
});

function qcrlRpc(method, args, cb) {

}