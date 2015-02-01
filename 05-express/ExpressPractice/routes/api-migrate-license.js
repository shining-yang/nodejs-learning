//
// API - Migrate license
//
var mysql = require('mysql');
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

// check whether the format of posted data is valid
function checkRequestFormat(requests) {
  for (var i = 0; i < requests.length; i++) {
    if (!requests[i].organization_id
      || requests[i].organization_id.constructor != String
      || requests[i].organization_id.length != 1) { // ONLY one element allowed
      return false;
    }
  }

  return true;
}

// ensure the two organizations for license migration are in the same group
function checkOrganizationsForSameGroup(req, res, sql) {
  var script = sqlScript.checkOrganizationsForSameGroup(req.params.orgIdIntSrc, req.params.orgIdIntDest);
  DIAG('SQL: ' + sql);
  sql.query(script, function (err, rows) {

  });
}

// check the destination organization state for license migration
function checkDestOrganizationState(req, res, sql) {
  var script = sqlScript.getOrganizationState(req.body.requests[0].organization_id);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sqlConn.release();
    } else if (rows.length <= 0) {
      res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
      sqlConn.release();
    } else if (rows[0].state == 'deducting') {
      res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
      sqlConn.release();
    } else if (rows[0].state != 'normal' && rows[0].state != 'exhausted') {
      res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
      sqlConn.release();
    } else {
      req.params.orgIdIntDest = rows[0].id;
      checkOrganizationsForSameGroup(req, res, sql);
    }
  });
}

// check the source organization state for license migration
function checkSrcOrganizationState(req, res, sql) {
  var script = sqlScript.getOrganizationState(req.params.orgId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      DIAG(err);
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
      sqlConn.release();
    } else if (rows.length <= 0) {
      res.status(406).end(buildErrorResponse('406-02', req.query.pretty));
      sqlConn.release();
    } else if (rows[0].state == 'deducting') {
      res.status(406).end(buildErrorResponse('406-01', req.query.pretty));
      sqlConn.release();
    } else if (rows[0].state != 'normal' && rows[0].state != 'exhausted') {
      res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
      sqlConn.release();
    } else {
      req.params.orgIdIntSrc = rows[0].id;
      checkDestOrganizationState(req, res, sql);
    }
  });
}

// API: migrate license
function apiMigrateLicense(req, res) {
  res.set('Content-Type', 'application/json');
  // check the API syntax
  if (!req.body
    || !Array.isArray(req.body.requests)
    || !checkRequestFormat(req.body.requests)) {
    res.status(400).end(buildErrorResponse('400-01', req.query.pretty));
    return;
  }

  mysqlPool.getConnection(function (err, sql) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      checkSrcOrganizationState(req, res, sql);
    }
  });
}

module.exports = apiMigrateLicense;
