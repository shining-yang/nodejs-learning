//
// Buffer sample
//
var Buffer = require('buffer').Buffer;
var util = require('util');

var intArray = new Uint32Array(new Buffer([1, 2, 3, 4]));
console.log(typeof(intArray), intArray.toString());

var buf1 = new Buffer('12345');
var buf2 = buf1.slice(1, 2);
var eq = buf1.equals(buf2);

console.log('buf1: ', buf1);
console.log('buf2: ', util.inspect(buf2));
console.log('Equals? ', eq);
console.log('Buffer is array? ', util.isArray(buf1));
console.log('Is array? ', util.isArray([buf1, buf2]));

var s1 = 'abc';
var s2 = s1;
s2 = s2.concat('123');

console.log(s1, ': ', s2);
for (var i = 0; i < s2.length; i++) {
    process.stdout.write(s2[i]);
}

console.log(process);