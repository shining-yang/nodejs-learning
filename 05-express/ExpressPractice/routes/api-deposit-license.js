//
// Deposit licenses
//
var mysql = require('mysql');
var util = require('util');

// build error messages
function buildErrorResponse(err, pretty) {
  var message = '';
  switch (err) {
    case '400-01':
      message = 'Syntax Error. The syntax is not correct or missing some parameters';
      break;
    case '420-02':
      message = 'Method Failure. The database is disconnected';
      break;
    case '406-01':
      message = 'Not Acceptable. The organization is not in exhausted mode';
      break;
    case '406-02':
      message = 'Not Acceptable. The organization is not existed';
      break;
    case '406-13':
      message = 'Not Acceptable. The organization is not in normal mode or exhausted mode';
      break;
  }

  var resJson = {
    errors: {
      code: err,
      message: message
    }
  };

  if (pretty === 'true') {
    return JSON.stringify(resJson, null, 3);
  } else {
    return JSON.stringify(resJson);
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
    if (arr[i] === item) {
      return true;
    }
  }

  return false;
}

//
function licenseContainsId(rows, id) {
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].license_id === id) {
      return true;
    }
  }
  return false;
}

// Get invalid licenses
function filterInvalidLicenses(requests, rows) {
  var idLicense = [];
  for (var i = 0; i < requests.length; i++) {
    if (!licenseContainsId(rows, requests[i].license_id)) {
      idLicense.push(requests[i].license_id);
    }
  }
  return idLicense;
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

  {
    console.log(req.query);
    console.log(req.body);
    console.log(req.params);
  }

  // check the API syntax
  if (!req.body
    || !Array.isArray(req.body.requests)
    || !checkRequestFormat(req.body.requests)) {
    res.status(400).end(buildErrorResponse('400-01', req.query.pretty));
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
  sqlConn.connect(function (err) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      var sql = 'SELECT state FROM organization WHERE name=?';
      sqlConn.query(sql, [req.query.orgId], function (err, rows) {
        console.log('Query statement: ' + sql);
        if (err) {
          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
          sqlConn.end();/*
           } else if (rows.length <= 0) {
           res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
           sqlConn.end();
           } else if (rows[0].state == 'deducting') {
           res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
           sqlConn.end();
           } else if (rows[0].state != 'normal' && rows[0].state != 'exhausted') {
           res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
           sqlConn.end();*/
        } else {
          // check usability
          var sql = 'SELECT * from license_generator where license_id in (';
          for (var i = 0; i < req.body.requests.length; i++) {
            if (i > 0) {
              sql += ', '; // append comma
            }
            sql += '\'';
            sql += req.body.requests[i].license_id;
            sql += '\'';
          }
          sql += ')';

          console.log('SQL: ' + sql);
          sqlConn.query(sql, function(err, rows) {
            if (err) {
              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
              sqlConn.end();
            } else if (rows.length !== req.body.requests.length) { // there are some licenses which cannot be selected out
              var invalidLicenses = filterInvalidLicenses(req.body.requests, rows);
              console.log('Dump all invalid license id: ');
              console.log(invalidLicenses);

              var resJson = {
                errors: []
              };

              for (var i = 0; i < invalidLicenses.length; i++) {
                resJson.errors.push({
                  license_id: invalidLicenses[i],
                  code: '406-05',
                  message: 'Not Acceptable. The license is not existed'
                });
              }

              if (req.query.pretty == 'true') {
                res.status(406).end(JSON.stringify(resJson, null, 3));
              } else {
                res.status(406).end(JSON.stringify(resJson));
              }
            } else {
              console.log(rows);
              res.status(200).end('{"error":"ok"}');
              sqlConn.end();
            }
          }); // query license
        }
      }); // query organization
    }
  }); // mysql connect()
}

module.exports = apiDepositLicense;
