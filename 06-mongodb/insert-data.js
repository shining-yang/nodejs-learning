//
// insert a record into mongodb
//
var mongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/test';

var insertDocument = function(db, cb) {
	db.collection('ysnCol').insertOne({
		date: new Date("2015-11-15T11:30:00Z"),
		location: 'ZGC',
		com: 'cloud'
	}, function (err, res) {
		assert.equal(err, null);
		console.log('A record been inserted.');
		cb(res);
	});
};

mongoClient.connect(url, function(err, db) {
	assert.equal(err, null);
	insertDocument(db, function (res) {
		console.log('Id: ', res.insertedId);
		db.close();
	});
});

console.log('Program to insert a record');

