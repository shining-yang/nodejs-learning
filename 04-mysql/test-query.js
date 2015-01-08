/**
 * sql statements
 */

var mysql = require('mysql');
var table = 'log';
var conn = mysql.createConnection({host: 'localhost', user: 'root', password: '111111'});

conn.query('use mysql_test');
conn.query('create table if not exists ' + table + ' (id int, name varchar(32))');

var sql = conn.query('SELECT * from ??', table);

sql.on('error', function(err) {
	console.log(err);
}).on('fields', function(fields) {
	console.log('Handling `fileds`: ');
	console.log(fields);
}).on('result', function(rows) {
	console.log('Handling `rows`: ');
	console.log(rows);
}).on('end', function() {
	console.log('All rows received.');
});

console.log(sql.sql);

conn.end();
