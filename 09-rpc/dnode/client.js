var dnode = require('dnode');

(function tryRpc() {
  var host = 'localhost',
    port = '4090',
    d = dnode.connect(host, port);

  // call remote procedure
  var str = 'Food: meat & fruite & water...';
  d.on('remote', function (remote) {
    remote.transform(str, function (s) {
      console.log('The result is: ', s);
      d.end();
    });
  });
}());

