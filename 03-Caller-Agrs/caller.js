/**
 * caller()
 * Shining Yang <y.s.n@live.com>, 2015-01-01
 */

function myCaller() {
	if (myCaller.caller) {
		console.log('Caller: ',  myCaller.caller.toString());
	} else {
		console.log('Its a top function call.');
	}
}

console.log('test case 1:');
(function () {
	myCaller();
})();

console.log('test case 2:');
myCaller();

