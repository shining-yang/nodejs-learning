
var jsstr = 'local=1; console.log("local=%d", local);';
//eval(jsstr);

//var fn = new Function(jsstr);
//fn();

//Function(jsstr)();

/*
(function() {
	eval(jsstr);
}());
*/

(function() {
	var local=3;
	eval(jsstr);
	console.log('now, local is %d', local);
}());


var month='06';
console.log("Month: %d", parseInt(month, 10));


var obj = (function() {
	return {
		name: 'json'
	};
}());

console.log(obj);
console.log(obj.name);
