/**
 * Code for fun: queen problem
 * Shining Yang <y.s.n@live.com>, 2014-12-27
 */

var n = 8; // the default is 8
if (process.argv.length > 2) {
	n = parseInt(process.argv[2]);
}

var Queen = require('./queen');
var q = new Queen(n);
q.Place();

console.log('Press ENTER key to exit...');
process.stdin.read();

