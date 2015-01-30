//
// Get license info
//
var mysql = require('mysql');
var sqlScript = require('./sql-statements');
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

// generate response on single license
function buildSuccessResponseSingle(cycle, license, pretty) {
  var resJson = {
    licenses: {
      id: license.id,
      original_points: license.original_point,
      remaining_points: license.remaining_point,
      unit: cycle,
      expiration: license.expiration,
      belongs_to: license.organization_id,
      deposited_by: license.user_id,
      activation_time: license.last_update
    }
  };

  return stringifyJsonObj(resJson, pretty);
}

// generate response on multiple licenses
function buildSuccessResponseMultiple(cycle, licenses, pretty) {
  var resJson = {
    licenses: []
  };

  for (var i = 0; i < licenses.length; i++) {
    resJson.licenses.push({
      id: licenses[i].id,
      original_points: licenses[i].original_point,
      remaining_points: licenses[i].remaining_point,
      unit: cycle,
      expiration: licenses[i].expiration,
      belongs_to: licenses[i].organization_id,
      deposited_by: licenses[i].user_id,
      activation_time: licenses[i].last_update
    });
  }

  return stringifyJsonObj(resJson, pretty);
}

// retrieve specified license info
function getLicenseInfoSingle(req, res, sql, cycle) {
  var script = sqlScript.getLicenseInfoWithId(req.params.orgId, req.params.licId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else if (rows.length != 1) {
      res.status(406).end(buildErrorResponseOnLicenses('406-05', [req.params.licId], req.query.pretty));
    } else {
      res.status(200).end(buildSuccessResponseSingle(cycle, rows[0], req.query.pretty));
    }

    sql.release();
  });
}

// retrieve all license info within the specified organization
function getLicenseInfoMultiple(req, res, sql, cycle) {
  var script = sqlScript.getLicenseInfo(req.params.orgId, req.params.licId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      res.status(200).end(buildSuccessResponseMultiple(cycle, rows, req.query.pretty));
    }

    sql.release();
  });
}

// access database for license info
function perform(req, res, sql, callback) {
  // 1. check organization state
  var script = sqlScript.getOrganizationState(req.params.orgId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rowsOrg) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sql.release();
    } else if (rowsOrg.length <= 0) {
      res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
      sql.release();
    } else if (rowsOrg[0].state == 'deducting') {
      res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
      sql.release();
    } else if (rowsOrg[0].state == 'removed') {
      res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
      sql.release();
    } else {
      DIAG('-------------------------------------------------');
      DIAG(typeof rowsOrg[0].id);
      DIAG(typeof rowsOrg[0].state);
      DIAG('-------------------------------------------------');
      req.params.orgIdInt = rowsOrg[0].id; // save organization id <int>
      DIAG(req.params.orgIdInt);
      // 2. get billing cycle which used as `unit`
      var script = sqlScript.getBillingCycle(req.params.orgIdInt);
      DIAG('SQL: ' + script);
      sql.query(script, function (err, rowsBillingCycle) {
        if (err || (rowsBillingCycle.length != 1)) {
          res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
          sql.release();
        } else {
          callback(req, res, sql, rowsBillingCycle[0].cycle);
        }
      }); // get billing cycle
    }
  }); // check organization state
}

// API implementation
function implement(req, res, callback) {
  res.set('Content-Type', 'application/json');
  mysqlPool.getConnection(function (err, sql) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      perform(req, res, sql, callback);
    }
  });
}

// API - get single license info
function apiGetLicenseInfoSingle(req, res) {
  implement(req, res, getLicenseInfoSingle);
}

// API - get all license info within specified organization-id
function apiGetLicenseInfo(req, res) {
  implement(req, res, getLicenseInfoMultiple);
}

module.exports.apiGetLicenseInfoSingle = apiGetLicenseInfoSingle;
module.exports.apiGetLicenseInfo = apiGetLicenseInfo;
