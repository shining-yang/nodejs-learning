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
function stringifyJsonResponse(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 2) + '\n';
  } else {
    return JSON.stringify(json) + '\n';
  }
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

  return stringifyJsonResponse(resJson, pretty);
}

// retrieve the specified license info
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
  }); // retrieve license info
}

// implement to retrieve license info
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
      // 2. get billing cycle which used as `unit`
      var script = sqlScript.getBillingCycle(req.params.orgId);
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

// API - get single license info
function apiGetLicenseInfo(req, res) {
  mysqlPool.getConnection(function (err, sql) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      perform(req, res, sql);
    }
  });
}

module.exports.apiGetLicenseInfoSingle = apiGetLicenseInfoSingle;
module.exports.apiGetLicenseInfoAll = apiGetLicenseInfoAll;
