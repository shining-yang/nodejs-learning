//
// example to show inherits
//
var util = require('util');

function Base() {
	this.name = 'Base';
	this.showName = function () {
		console.log('name: ', this.name);
	};
}

Base.prototype.showSomething = function () {
	console.log('I\'d like to show you something.');
};

function Derived() {
	this.number = 100;
}

util.inherits(Derived, Base);

(function test() {
	var b = new Base();
	b.showName();
	b.showSomething();
	console.log(b);

	var d = new Derived();
	//d.showName();
	d.showSomething();
	console.log(util.inspect(d));
})();
