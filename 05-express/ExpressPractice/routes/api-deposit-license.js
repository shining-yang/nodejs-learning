//
// API - Deposit licenses
//
var mysql = require('mysql');
var util = require('util');
var sqlScript = require('./sql-statements')
var DIAG = console.log;
var mysqlOptions = {
  //host: '192.168.113.132',
  //port: 3306,
  user: 'root',
  password: '111111',
  database: 'license'
};
var mysqlPool = mysql.createPool(mysqlOptions);


// stringify json object
function stringifyJsonObj(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 2) + '\n';
  } else {
    return JSON.stringify(json) + '\n';
  }
}

// build error response message
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

  return stringifyJsonObj({
    errors: {
      code: err,
      message: msg
    }
  }, pretty);
}

// Generate error response with licenses
function buildErrorResponseOnLicenses(err, licenseIds, pretty) {
  var msg = '';
  switch (err) {
    case '406-05':
      msg = 'Not Acceptable. The license is not existed';
      break;
    case '409-03':
      msg = 'Conflict. The license has been deposited'; // already been used
      break;
    case '409-04':
      msg = 'Conflict. Duplicated data in the requested content';
      break;
  }

  var resJson = {
    errors: []
  };

  for (var i = 0; i < licenseIds.length; i++) {
    resJson.errors.push({
      license_id: licenseIds[i],
      code: err,
      message: msg
    });
  }

  return stringifyJsonObj(resJson, pretty);
}

function buildSuccessResponse(orgId, req, lic, cycle, pretty) {
  var resJson = {
    licenses: []
  };

  for (var i = 0; i < req.length; i++) {
    resJson.licenses.push({
      id: req[i].license_id,
      points: lic[i].points,
      unit: cycle,
      expiration: 0,
      belongs_to: orgId,
      deposited_by: req[i].deposited_by
    });
  }

  return stringifyJsonObj(resJson, pretty);
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
    res.status(409).end(buildErrorResponseOnLicenses('409-04', dupIds, req.query.pretty));
    return;
  }

  // access database
  //
  mysqlPool.getConnection(function (err, sqlConn) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      // 1. check organization state
      var sql = sqlScript.getOrganizationState(req.params.orgId);
      DIAG('SQL: ' + sql);
      sqlConn.query(sql, function (err, rowsOrg) {
        if (err) {
          DIAG(err);
          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
          sqlConn.release();
        } else if (rowsOrg.length <= 0) {
          res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
          sqlConn.release();
        } else if (rowsOrg[0].state == 'deducting') {
          res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
          sqlConn.release();
        } else if (rowsOrg[0].state != 'normal' && rowsOrg[0].state != 'exhausted') {
          res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
          sqlConn.release();
        } else {
          // 2. determine whether licenses been used
          var sql = sqlScript.checkLicenseUsablity(req.body.requests);
          DIAG('SQL: ' + sql);
          sqlConn.query(sql, function (err, usedIds) {
            if (err) {
              DIAG(err);
              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
              sqlConn.release();
            } else if (usedIds.length > 0) {
              // some specified licenses already been used
              res.status(409).end(buildErrorResponseOnLicenses('409-03', usedIds, req.query.pretty));
              sqlConn.release();
            } else {
              // 3. check licenses for existence
              var sql = sqlScript.checkLicenseExistence(req.body.requests, req.users);
              DIAG('SQL: ' + sql);
              sqlConn.query(sql, function (err, validLicenses) {
                if (err) {
                  DIAG(err);
                  res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                  sqlConn.release();
                } else if (validLicenses.length !== req.body.requests.length) {
                  // some specified app_id:licenses does not exist
                  var invalidIds = filterInvalidLicenses(req.body.requests, validLicenses);
                  DIAG('Invalid license id: ' + invalidIds);
                  res.status(406).end(buildErrorResponseOnLicenses('406-05', invalidIds, req.query.pretty));
                  sqlConn.release();
                } else {
                  sqlConn.beginTransaction(function (err) {
                    if (err) {
                      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                      sqlConn.release();
                    } else {
                      // insert into license
                      var sql = sqlScript.insertDepositLicense(req.params.orgId, req.body.requests, validLicenses);
                      DIAG('SQL: ' + sql);
                      sqlConn.query(sql, function (err, results) {
                        if (err) {
                          sqlConn.rollback(function () {
                          });
                          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                          sqlConn.release();
                        } else {
                          // insert into license-log
                          var sql = sqlScript.insertDepositLicenseLog(req.params.orgId, validLicenses);
                          DIAG('SQL: ' + sql);
                          sqlConn.query(sql, function (err, results) {
                            if (err) {
                              sqlConn.rollback(function () {
                              });
                              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                              sqlConn.release();
                            } else {
                              // get billing cycle (unit)
                              var sql = sqlScript.getBillingCycle(req.params.orgId);
                              DIAG('SQL: ' + sql);
                              sqlConn.query(sql, function (err, rowsBillingCycle) {
                                if (err || (rowsBillingCycle.length !== 1)) {
                                  sqlConn.rollback(function () {
                                  });
                                  res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                                  sqlConn.release();
                                } else {
                                  sqlConn.commit(function (err) {
                                    if (err) {
                                      sqlConn.rollback(function () {
                                      });
                                      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                                      sqlConn.release();
                                    } else {
                                      DIAG('Deposit licenses success.');
                                      res.status(201).end(buildSuccessResponse(
                                        req.params.orgId, rowsBillingCycle[0].cycle,
                                        req.body.requests, validLicenses, req.query.pretty));
                                      sqlConn.release();
                                    }
                                  }); // commit transaction
                                }
                              }); // get billing cycle
                            }
                          }); // insert license-log
                        }
                      }); // insert license
                    }
                  }); // stat transaction
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
