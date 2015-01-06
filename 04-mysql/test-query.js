/**
 * sql statements
 */

var mysql = require('mysql');
var table = 'log';
var conn = mysql.createConnection({host: 'localhost', user: 'root', password: '111111'});

var sql = conn.query('SELECT COUNT(*) from ?', table, function(err) {
	if (err) {
		console.log('Error occurred.' + err);
	}
});

console.log('SQL: ' + sql);

