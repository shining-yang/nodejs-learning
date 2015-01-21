//
// Get license server status
//
var mysql = require('mysql');

function apiDepositLicense(req, res) {
  if (!req.body) {
    console.log('requset body is empty.');
  } else if (!Array.isArray(req.body.requests)) {
    res.status(400).end(JSON.stringify({
      error: '400-01',
      message: 'Not acceptable. Syntax error.'
    }, null, 2));
  } else {
    var options = {
      host: 'localhost',
      user: 'root',
      password: '111111'
    };

    var connection = mysql.createConnection(options, function(err, res) {
      if (err) {
        console.log('Fail to create mysql connection.');
        res.status(420).end('{ "error": "Database not connected" }');
        return;
      }
    });

    connection.beginTransaction(function(err) {
      if (err) {
        throw err;
      }
      
      connection.query('INSERT INTO license VALUES ()', function(err, res) {
        if (err) {
          connection.rollback(function() {
            throw err;
          });
        }
        
        connection.query('INSERT INTO license_log VALUES ()', function(err, res) {
          if (err) {
            connection.rollback(function() {
              throw err;
            });
          }
          
          connection.commit(function(err) {
            if (err) {
              connection.rollback(function() {
                throw err;
              });
            }
            
            console.log('Deposit license OK');
          });
        });
      }); 
    });
  }
}

module.exports = apiDepositLicense;