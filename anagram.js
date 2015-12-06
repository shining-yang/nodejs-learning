//
// anagram
//
var anagrams = [
	[ 'spot', 'stop' ],
	[ 'bus', 'sub' ],
	[ 'glass' ]
];

function printArray(a) {
	process.stdout.write('[ ');
	a.forEach(function (e) {
		process.stdout.write('\'' + e + '\' ');
	});
	process.stdout.write(']\n');
}

anagrams.forEach(function (a) {
	printArray(a);
});
