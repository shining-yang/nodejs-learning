var L = console.log;

var o = new Object();
L('o.constructor: ', o.constructor === Object);


o = new Object('A string');
L("what's o: ", typeof o, o);
L(o.substring, o.substring());


//--------------------
var person = new Object();
person.printName = function() {
	L(this._getFullName());
};

person._getFullName = function() {
	return this.firstName + ' ' + this.lastName;
};

person.setName = function(fn, ln) {
	this.firstName = fn;
	this.lastName = ln;
};

person.setName('Shining', 'Yang');
person.printName();

var BS = require('./bubblesort');
var array = [8, 1, 3, 4, 6, 2, 7, 9, 5];
BS.sort(array, array.length);
console.log('Sorted: ', array);

var arr2 = ['A', 'bbc', 'Dog', 'assert', 'Zebra', 'OK', 'FIN'];
BS.sort(arr2, arr2.length);
console.log('Sort string array: ', arr2);
