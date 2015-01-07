/**
 * sql statements
 */

var mysql = require('mysql');
var table = 'log';
var conn = mysql.createConnection({host: 'localhost', user: 'root', password: '111111'});

conn.query('use mysql_test');
conn.query('create table if not exists ' + table + ' (id int, name varchar(32))');

var sql = conn.query('SELECT COUNT(*) from ??', table, function(err, row) {
	if (err) {
		console.log('Error occurred.' + err);
	} else {
		console.log(row);
	}
});

console.log(sql.sql);

conn.end();
