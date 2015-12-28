var qcrlRpc = require('./qcrl-rpc');

for (var id = 1000; id <= 10000; id++) {
  (function (id) {
    var method = 'queryVenueUserOptions';//'queryVenueUserById';//'queryVenueTypeById';
    var arg = {
      //id: id
    };

    qcrlRpc.call(method, [JSON.stringify(arg)], function (err, reply) {
      if (err) {
        console.log('Error: ', err.stack);
      } else {
        if ((typeof reply) === 'object') {
          if (reply.fault === true) {
            reply.content.forEach(function(v, k) {
              console.log(k, ': ', v);
            });
          }
        } else if (typeof reply === 'string') {
          console.log('ID: ', id, ', Reply: ', JSON.parse(reply));
        } else {
          console.log('Unrecognized data type.');
        }
      }
    });
  })(id);
}