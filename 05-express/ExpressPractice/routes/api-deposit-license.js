//
// Get license server status
//
var util = require('util');
var mysql = require('mysql');

// check whether the format of posted data is valid
function checkReqFormat(requests) {
  console.log('Check the format of requested data');
  var n = requests.length;
  for (var i = 0; i < n; i++) {
    if (!requests[i].license_id || requests[i].license_id.length <= 0) {
      return false;
    }
    
    if (!requests[i].deposited_by || requests[i].deposited_by.length <= 0) {
      return false;
    }
  }
  
  return true;
}

function arrayContains(arr, item) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == item) {
      return true;
    }
  }
  
  return false;
}

function getDuplicateLicenseIds(requests) {
  var idUnique = [];
  var idDuplicate = [];
  for (var i = 0; i < requests.length; i++) {
    if (!arrayContains(idUnique, requests[i].license_id)) {
      idUnique.push(requests[i].license_id));
    } else {
      if (!arrayContains(idDuplicate, requests[i].license_id)) {
        idDuplicate.push(requests[i].license_id);
      }
    }
  }
  
  return idDuplicate;
}

function apiDepositLicense(req, res) {
  if (!req.body || !Array.isArray(req.body.requests) || !checkReqFormat(req.body.requests)) {
    var resJson = {
			errors: {
        code: '400-01',
        message: 'Syntax Error. The syntax is not correct or missing some parameters'
      }
    };
    
    if (req.query.pretty == 'true') {
      res.status(400).end(JSON.stringify(resJson, null, 3));
    } else {
      res.status(400).end(JSON.stringify(resJson));
    }
    
    return;  
  }
  
  var dupLicenseIds = getDuplicateLicenseIds(req.body.requests);
  if (dupLicenseIds.length > 0) {
    var resJson = {};
    for (var i = 0; i < dupLicenseIds.length; i++) {
      resJson.errors.push({
        license_id: dupLicenseIds[i],
        code: '409-04',
        message: 'Not acceptable. Duplicate request parameters'
      });
    }
    
    if (req.query.pretty == 'true') {
      res.status(409).end(JSON.stringify(resJson, null, 3));
    } else {
      res.status(409).end(JSON.stringify(resJson));
    }
    
    return;      
  }
  
  var options = {
    host: '192.168.113.132',
    port: 3306,
    user: 'root',
    password: '111111',
    database: 'license'
  };

  console.log('Creating mysql connection...');
  
  var connection = mysql.createConnection(options);
  connection.connect(function(err) {
    if (err) {
      var resJson = {
        errors: {
          code: '420-02',
          message: 'Method Failure. The database is disconnected'
        }
      };
        
      if (req.query.pretty == 'true') {
        res.status(420).end(JSON.stringify(resJson, null, 3));
      } else {
        res.status(420).end(JSON.stringify(resJson));
      }
      
      return;
    }
    
    
    connection.end();
  });
        
        /*
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
    */
}

module.exports = apiDepositLicense;