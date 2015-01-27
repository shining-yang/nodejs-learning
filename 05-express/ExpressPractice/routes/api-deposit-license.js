//
// Deposit licenses
//
var mysql = require('mysql');
var util = require('util');

// build sql statement
function getSqlCheckOrganization(organizationId) {
  var sql = 'SELECT state FROM organization WHERE name=?';
  var escapes = [organizationId];
  return mysql.format(sql, escapes)
}

function getSqlCheckLicenseExist(requests, appId) {
  var sql = 'SELECT * FROM license_generator WHERE license_id IN (';
  for (var i = 0; i < requests.length; i++) {
    if (i > 0) {
      sql += ', '; // append comma
    }
    sql += '\'';
    sql += requests[i].license_id;
    sql += '\'';
  }
  sql += ')';

//  sql += ' AND app_id=\'';
//  sql += appId;
//  sql += '\'';

  return sql;
}

// stringify json object
function stringifyJsonResponse(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 3);
  } else {
    return JSON.stringify(json);
  }
}

// build error messages
function buildErrorResponse(err, pretty) {
  var msg = '';
  switch (err) {
    case '400-01':
      msg = 'Syntax Error. The syntax is not correct or missing some parameters';
      break;
    case '420-02':
      msg = 'Method Failure. The database is disconnected';
      break;
    case '406-01':
      msg = 'Not Acceptable. The organization is not in exhausted mode';
      break;
    case '406-02':
      msg = 'Not Acceptable. The organization is not existed';
      break;
    case '406-13':
      msg = 'Not Acceptable. The organization is not in normal mode or exhausted mode';
      break;
  }

  return stringifyJsonResponse({
    errors: {
      code: err,
      message: msg
    }
  }, pretty);
}

// Generate error response with licenses
function buildErrorResponseOnLicense(err, pretty, ids) {
  var msg = '';
  switch (err) {
    case '406-05':
      msg = 'Not Acceptable. The license is not existed';
      break;
    case '409-03':
      msg = 'Conflict. Duplicated license'; // already been used
      break;

    case '409-04':
      msg = 'Not acceptable. Duplicate request parameters'; // API requests contains duplicate ids
      break;
  }

  var resJson = {
    errors: []
  };

  for (var i = 0; i < ids.length; i++) {
    resJson.errors.push({
      license_id: ids[i],
      code: err,
      message: msg
    });
  }

  return stringifyJsonResponse(resJson, pretty);
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

  // check the API syntax
  if (!req.body
    || !Array.isArray(req.body.requests)
    || !checkRequestFormat(req.body.requests)) {
    res.status(400).end(buildErrorResponse('400-01', req.query.pretty));
    return;
  }

  // check if there are some duplicated requests
  var duplicateIds = getDuplicateLicenseIds(req.body.requests);
  if (duplicateIds.length > 0) {
    res.status(409).end(buildErrorResponseOnLicense('409-04', req.query.pretty, duplicateIds));
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
      var sql = getSqlCheckOrganization(req.query.orgId);
      sqlConn.query(sql, function (err, rows) {
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
          /*
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
*/
          var sql = getSqlCheckLicenseExist(req.body.requests);
          //console.log('SQL: ' + sql);
          sqlConn.query(sql, function(err, rows) {
            if (err) {
              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
              sqlConn.end();
            } else if (rows.length !== req.body.requests.length) { // there are some licenses which cannot be selected out
              var invalidLicenses = filterInvalidLicenses(req.body.requests, rows);
              res.status(406).end(buildErrorResponseOnLicense('406-05', req.query.pretty, invalidLicenses));
              console.log('Dump all invalid license id: ');
              console.log(invalidLicenses);
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
