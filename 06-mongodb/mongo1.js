//
//
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var uri = 'mongodb://localhost:27017/test';
mongoClient.connect(uri, function (err, db) {
	assert.equal(err, null);
	if (err) {
		console.log('Something wrong: ', err);
		return;
	}
	console.log('Connect mongodb success.');
	db.close();
});

console.log('First mongodb program.');