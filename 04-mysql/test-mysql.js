/**
 * mysql test
 */

var mysql = require('mysql');

var con = mysql.createConnection({
	host: '192.168.113.130',
	user: 'root',
	password: '111111',
});

con.connect(function(err, res) {
	if (err) {
		console.log('Failed to connect database: ' + err);
		return;
	} else {
		console.log('Database connected: ' + res);
	}
});

var dbTest = 'mysql_test';
var sqlCreateDB = 'create database ' + dbTest;
var sqlUseDB = 'create database ' + dbTest;

con.query(sqlCreateDB, function(err, res) {
	if (err) {
		console.log('On DB create: ' + err);
	} else {
		console.log(res);
	}

	con.query(sqlUseDB, function(err1, res1) {
		if (err) {
			console.log('On using DB: ' + err);
		} else {
			console.log(res);
		}
	});
});

con.end();

