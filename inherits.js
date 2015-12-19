#!/usr/bin/env node
//
// example to show inherits
//
var util = require('util');

function Base(name) {
	this.name = name;
	this.showName = function () {
		console.log('name: ', this.name);
	};
}

Base.prototype.showSomething = function () {
	console.log('I\'d like to show you something. Property: ', this.name);
};

function Derived(name) {
    this.name = name;
	this.number = 100;
}

util.inherits(Derived, Base);

(function test() {
	var b = new Base('base');
	b.showName();
	b.showSomething();
	console.log(b);

	var d = new Derived('derived');
	//d.showName();
	d.showSomething();
	console.log(util.inspect(d));
})();
