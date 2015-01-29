//
// Deposit licenses
//
var mysql = require('mysql');
var util = require('util');
var DIAG = console.log;
var mysqlOptions = {
  //host: '192.168.113.132',
  //port: 3306,
  user: 'root',
  password: '111111',
  database: 'license'
};

var mysqlPool = mysql.createPool(mysqlOptions);

// get state of organization
function getSqlCheckOrganization(organizationId) {
  var sql = 'SELECT state FROM organization WHERE name=?';
  var escapes = [organizationId];
  return mysql.format(sql, escapes)
}

// check whether licenses exist or not
function getSqlCheckLicenseExistence(requests, appId) {
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

// check whether licenses already been used by someone else （取集合交集）
function getSqlCheckLicenseUsablity(requests) {
  var sql = 'SELECT id FROM (';
  for (var i = 0; i < requests.length; i++) {
    if (i > 0) {
      sql += ' UNION ';
    }
    sql += '(SELECT \'';
    sql += requests[i].license_id;
    sql += '\' AS id)';
  }
  sql += ') AS yourID';
  sql += ' INNER JOIN ';
  sql += '((SELECT id FROM license) UNION (SELECT id FROM license_history)) AS ourID'
  sql += ' USING (id)';

  return sql;
}

// stringify json object
function stringifyJsonResponse(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 2) + '\n';
  } else {
    return JSON.stringify(json) + '\n';
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
  var ids = [];
  for (var i = 0; i < requests.length; i++) {
    if (!licenseContainsId(rows, requests[i].license_id)) {
      ids.push(requests[i].license_id);
    }
  }
  return ids;
}

// Get duplicated license ids
function getDuplicateLicenseIds(requests) {
  var idsExisted = [];
  var idsDuplicate = [];
  for (var i = 0; i < requests.length; i++) {
    if (!arrayContains(idsExisted, requests[i].license_id)) {
      idsExisted.push(requests[i].license_id);
    } else {
      if (!arrayContains(idsDuplicate, requests[i].license_id)) {
        idsDuplicate.push(requests[i].license_id);
      }
    }
  }

  return idsDuplicate;
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
  var dupIds = getDuplicateLicenseIds(req.body.requests);
  if (dupIds.length > 0) {
    res.status(409).end(buildErrorResponseOnLicense('409-04', req.query.pretty, dupIds));
    return;
  }

  // access database
  //
  DIAG('Connecting mysql ...');

//  var sqlConn = mysql.createConnection(mysqlOptions);
//  sqlConn.connect(function (err) {
  mysqlPool.getConnection(function (err, sqlConn) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      // 1. check organization state
      var sql = getSqlCheckOrganization(req.params.orgId);
      DIAG('SQL: ' + sql);
      sqlConn.query(sql, function (err, rows) {
        if (err) {
          DIAG(err);
          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
          sqlConn.release();
          /*
           } else if (rows.length <= 0) {
           res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
           sqlConn.release();
           } else if (rows[0].state == 'deducting') {
           res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
           sqlConn.release();
           } else if (rows[0].state != 'normal' && rows[0].state != 'exhausted') {
           res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
           sqlConn.release();*/
        } else {
          // 2. determine whether licenses been used
          var sql = getSqlCheckLicenseUsablity(req.body.requests);
          DIAG('SQL: ' + sql);
          sqlConn.query(sql, function (err, rows) {
            if (err) {
              DIAG(err);
              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
              sqlConn.release();
            } else if (rows.length > 0) { // some specified licenses already been used
              res.status(409).end(buildErrorResponseOnLicense('409-03', req.query.pretty), rows);
              sqlConn.release();
            } else {
              // 3. check licenses for existence
              var sql = getSqlCheckLicenseExistence(req.body.requests);
              DIAG('SQL: ' + sql);
              sqlConn.query(sql, function (err, rows) {
                if (err) {
                  DIAG(err);
                  res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                  sqlConn.release();
                } else if (rows.length !== req.body.requests.length) { // some specified app_id:licenses does not exist
                  var ids = filterInvalidLicenses(req.body.requests, rows);
                  DIAG('Invalid license id: ' + ids);
                  res.status(406).end(buildErrorResponseOnLicense('406-05', req.query.pretty, ids));
                  sqlConn.release();
                } else {
                  sqlConn.beginTransaction(function (err) {
                    if (err) {
                      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                      sqlConn.release();
                    } else {
                      var sql = 'select count(*) from license_generator'; // insert license
                      sqlConn.query(sql, function(err, results) {
                        if (err) {
                          sqlConn.rollback(function() {

                          });
                          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                          sqlConn.release();
                        } else {
                          var sql = 'select count(*) from license_generator'; // insert license-log
                          sqlConn.query(sql, function(err, results) {
                            if (err) {
                              sqlConn.rollback(function() {

                              });
                              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                              sqlConn.release();
                            } else {
                              sqlConn.commit(function(err) {
                                if (err) {
                                  sqlConn.rollback(function() {

                                  });
                                  res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                                  sqlConn.release();
                                } else {
                                  DIAG('Deposit licenses success.')
                                  res.status(200).end('{"error":"ok"}' + '\n');
                                  sqlConn.release();
                                }
                              }); // commit transaction
                            }
                          }); // insert license-log
                        }
                      }); // insert license
                    }
                  }); // transaction
                }
              }); // check licenses for existence
            }
          }); // determine whether licenses been used
        }
      }); // check organization state
    }
  }); // mysql connect()
}

module.exports = apiDepositLicense;
