//
// API - erase license
//
var mysql = require('mysql');
var util = require('util');
var sqlScript = require('./sql-statements')
var DIAG = console.log;
var mysqlOptions = {
  host: '192.168.154.130',
  port: 3306,
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
    case '406-12':
      msg = 'Not Acceptable. The license does not have any points';
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
      msg = 'Conflict. The license has been deposited';
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

// step - perform the operations on erase license
function performEraseLicense(req, res, sql) {
  sql.beginTransaction(function (err) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else {
      // 1. copy to history
      var script = sqlScript.copyLicenseToHistory(req.params.orgIdInt, req.params.licId);
      DIAG('SQL: ' + sql);
      sql.query(script, function (err, result) {
        if (err) {
          sql.rollback(function () {
          });
          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
          sql.release();
        } else {
          // 2. remove entry from license
          var script = sqlScript.removeLicense(req.params.orgIdInt, req.params.licId);
          DIAG('SQL: ' + sql);
          sql.query(script, function (err, result) {
            if (err) {
              sql.rollback(function () {});
              res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
              sql.release();
            } else {
              // 3. log on erase license
              var sql = sqlScript.insertEraseLicenseLog(req.params.orgIdInt, req.params.licId, req.params.changePoints);
              DIAG('SQL: ' + sql);
              sql.query(script, function (err, result) {
                if (err) {
                  sql.rollback(function () {
                  });
                  res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                  sql.release();
                } else {
                  sql.commit(function (err) {
                    if (err) {
                      sql.rollback(function () {
                      });
                      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
                      sql.release();
                    } else {
                      DIAG('Erase license success.');
                      res.status(200).end({}, req.query.pretty);
                    }
                  }); // commit
                }
              });
            }
          });
        }
      });
    }
  });
}

// step - verify that license has enough remaining-points for next-cycle billing
function verifyLicenseRemainingPoints(req, res, sql) {
  var script = 'call calculate_budget';
  sql.query(script, function (err, rows) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else if (rows.length <= 0) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else if (rows[0].hasEnoughPoints == 0) {
      res.status(406).end(buildErrorResponse('420-12', req.query.pretty));
      sql.release();
    } else {
      performEraseLicense(req, res, sql);
    }
  });
}

// step - ensure license exist (ALSO retrieve remaining-points)
function checkLicenseExistence(req, res, sql) {
  var script = sqlScript.getLicenseRemainingPoint(req.params.orgIdInt, req.params.licId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else if (rows.length <= 0) {
      res.status(406).end(buildErrorResponseOnLicenses('406-05', [req.params.licId], req.query.pretty));
      sql.release();
    } else {
      req.params.licRemainingPoints = rows[0].remaining_point;
      verifyLicenseRemainingPoints(req, res, sql);
    }
  });
}

// step - check organization state
function checkOrganizationState(req, res, sql) {
  var script = sqlScript.getOrganizationState(req.params.orgId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else if (rows.length <= 0) {
      res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
      sql.release();
    } else if (rows[0].state == 'deducting') {
      res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
      sql.release();
    } else if (rows[0].state != 'normal' && rows[0].state != 'exhausted') {
      res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
      sql.release();
    } else {
      req.params.orgIdInt = rows[0].id;
      checkLicenseExistence(req, res, sql);
    }
  });
}

// API: erase license
function apiEraseLicense(req, res) {
  res.set('Content-Type', 'application/json');
  mysqlPool.getConnection(function (err, sql) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      checkOrganizationState(req, res, sql);
    }
  });
}


module.exports = apiEraseLicense;
