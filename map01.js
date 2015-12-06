//

var util = require('util');

var k = ['tom', 'jackie', 'smith'];
var v = [38, 42, 41];
var map = {};
while (k.length) {
	map[k.pop()] = v.pop();
}

console.log(typeof(map));
console.log(util.inspect(map));
console.log(Date().toString());
