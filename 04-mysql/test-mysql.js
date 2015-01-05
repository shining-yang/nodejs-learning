/**
 * mysql test
 */
var util = require('util');
var mysql = require('mysql');

var con = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '111111',
});

con.connect(function(err, res) {
	if (err) {
		console.log('Failed to connect database: ' + err.stack);
		return;
	} else {
		console.log('Database connected: ' + util.inspect(res));
	}
});

var dbTest = 'mysql_test';
var sqlCreateDB = 'create database if not exists ' + dbTest;
var sqlUseDB = 'use database ' + dbTest;

con.query(sqlCreateDB, function(err, res) {
	if (err) {
		console.log('On DB create: ' + err);
		return;
	} else {
		console.log('Create DB executed successfully.');
	}

	con.query(sqlUseDB, function(err1, res1) {
		if (err) {
			console.log('On using DB: ' + err);
		} else {
			console.log('Using DB: ' + dbTest);
		}
	});
});

con.end();

