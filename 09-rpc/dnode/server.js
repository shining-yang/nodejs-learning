
var dnode = require('dnode');

var server = dnode({
  tranform: function(s, cb) {
    cb(s.replace(/[aeiou]{2,}/, 'oo').toUpperCase());
  }
});

server.listen(4090);
