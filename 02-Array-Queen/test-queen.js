/**
 * Code for fun: queen problem
 * Shining Yang <y.s.n@live.com>, 2014-12-27
 */

if (process.argv.length < 3) {
	console.log('You must specify the number of queens first.');
} else {
var Queen = require('./queen');
var n = parseInt(process.argv[2]);
var q = new Queen(n);
q.Place();
}
