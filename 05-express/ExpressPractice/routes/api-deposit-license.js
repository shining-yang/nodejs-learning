//
// Get license server status
//
var util = require('util');
var mysql = require('mysql');

function apiDepositLicense(req, res) {
  if (!req.body) {
    console.log('requset body is empty.');
  } else if (!Array.isArray(req.body.requests)) {
	  console.log(req.body);
		console.log(util.inspect(req.body.requests));
    res.status(400).end(JSON.stringify({
			errors: {
        code: '400-01',
        message: 'Syntax Error. The syntax is not correct or missing some parameters'
      }
    }, null, 3));
  } else {
    var options = {
      host: '192.168.113.132',
			port: 3306,
      user: 'root',
      password: '111111',
			database: 'license'
    };

    console.log('Creating mysql connection...');
		
    var connection = mysql.createConnection(options, function(err, res) {
      if (err) {
        console.log('Fail to create mysql connection.');
          res.status(420).end(JSON.stringigy({
            errors: {
              code: '420-01',
              message: 'Database not connected'
            }
          }, null, 3));
          return;
      }
    
      connection.connect(function(err) {
        if (err) {
          console.log('Fail to connect mysql');
          res.status(420).end(JSON.stringigy({
            errors: {
              code: '420-01',
              message: 'Database not connected'
            }
          }, null, 3));
          return;
        }
      });
          
			console.log('Begin transaction...');
			
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
    });
  }
}

module.exports = apiDepositLicense;