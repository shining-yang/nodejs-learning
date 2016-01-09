#!/usr/bin/env node

var dnode = require('dnode');

var server = dnode({
  transform: function(s, cb) {
    cb(s.replace(/[aeiou]{2,}/g, '**').toUpperCase());
  }
});

server.listen(4090);
