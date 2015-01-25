//
// Get license server status
//
var mysql = require('mysql');
var util = require('util');

// 420-02
function responseWithError(res, pretty, errStatus, errCode) {
  var resJson = {
    errors: {
    }
  };
  
  resJson.errors.code = errCode;
  switch (errCode) {
    case '400-01':
      resJson.errors.message = 'Syntax Error. The syntax is not correct or missing some parameters';
      break;
    case '420-02':
      resJson.errors.message = 'Method Failure. The database is disconnected';
      break;
    case '406-01':
      resJson.errors.message = 'Not Acceptable. The organization is not in exhausted mode';
      break;
    case '406-02':
      resJson.errors.message = 'Not Acceptable. The organization is not existed';
      break;
    default:
      resJson.errors.message = 'Unknown error';
      break;
  }
    
  if (pretty == 'true') {
    res.status(errStatus).end(JSON.stringify(resJson, null, 3));
  } else {
    res.status(errStatus).end(JSON.stringify(resJson));
  }
}

// check whether the format of posted data is valid
function checkRequestFormat(requests) {
  for (var i = 0; i < requests.length; i++) {
    if (!requests[i].license_id
      || requests[i].license_id.constructor != String
      || requests[i].license_id.length <= 0) {
      return false;
    }
    
    if (!requests[i].deposited_by
      || requests[i].deposited_by.constructor != String
      || requests[i].deposited_by.length <= 0) {
      return false;
    }
  }
  
  return true;
}

// Determine if an array contains the specified element
function arrayContains(arr, item) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] == item) {
      return true;
    }
  }
  
  return false;
}

// Get duplicated license ids
function getDuplicateLicenseIds(requests) {
  var idUnique = [];
  var idDuplicate = [];
  for (var i = 0; i < requests.length; i++) {
    if (!arrayContains(idUnique, requests[i].license_id)) {
      idUnique.push(requests[i].license_id);
    } else {
      if (!arrayContains(idDuplicate, requests[i].license_id)) {
        idDuplicate.push(requests[i].license_id);
      }
    }
  }
  
  return idDuplicate;
}

// API: deposit licenses
function apiDepositLicense(req, res) {
  // check the API syntax
  if (!req.body
    || !Array.isArray(req.body.requests)
    || !checkRequestFormat(req.body.requests)) {
    responseWithError(res, req.query.pretty, 400, '400-01');
    return;
  }
  
  // check if there are some duplicated requests
  var dupLicenseIds = getDuplicateLicenseIds(req.body.requests);
  if (dupLicenseIds.length > 0) {
    var resJson = {
      errors: []
	  };
    
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
  
  //
  // access database
  //
  var options = {
    //host: '192.168.113.132',
    //port: 3306,
    user: 'root',
    password: '111111',
    database: 'license'
  };

  console.log('Connecting mysql ...');
   
  var sqlConn = mysql.createConnection(options);
  sqlConn.connect(function(err) {
    if (err) {
      responseWithError(res, req.query.pretty, 420, '420-02');
      return;
    }
    
    var sql = 'SELECT state FROM organization WHERE name=?';
    sqlConn.query(sql, req.query.orgId, function(err, result) {
      if (err) {
        responseWithError(res, req.query.pretty, 420, '420-02');
        sqlConn.end();
        return;
      }
      
      if (result.length <= 0) { // no records
        responseWithError(res, req.query.pretty, 406, '406-02');
        sqlConn.end();
        return;
      }
      
      if (result[0].state === 'deducting') {
        responseWithError(res, req.query.pretty, 406, '406-01');
        sqlConn.end();
        return;
      }
      
      console.log(result);
    
      
      console.log('Finish accessing mysql');
    
      var resSuccess = {};
      resSuccess.licenses = req.body.requests;

      if (req.query.pretty == 'true') {
        res.status(200).end(JSON.stringify(resSuccess, null, 3));
      } else {
        res.status(200).end(JSON.stringify(resSuccess));
      }
    });

    sqlConn.end();
    res.status(400).end('Error occurred');
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
