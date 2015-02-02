//
// API - Get license log
//
var mysql = require('mysql');
var sqlScript = require('./sql-statements');
var DIAG = console.log;
var mysqlOptions = {
  host: '192.168.113.132',
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

// generate response on single license
function buildSuccessResponseSingle(timeZone, logs, pretty) {
  var resJson = {
    license_id: logs[0].license_id,
    remaining_points: logs[0].remaining_point,
    logs: []
  };

  for (var i = 0; i < logs.length; i++) {
    resJson.logs.push({
      change_points: logs[i].change_point,
      action: logs[i].action,
      time_zone: timeZone,
      update_time: logs[i].last_update
    });
  }

  return stringifyJsonObj(resJson, pretty);
}

// append a license-log to JSON for response
function appendLicenseLogToResponseJson(json, timeZone, log) {
  var count = json.licenses.length;
  if ((count == 0) || (json.licenses[count - 1].id != log.license_id)) {
    var licenseLogJson = {
      id: log.license_id,
      remaining_points: log.remaining_point,
      logs: []
    };
    licenseLogJson.logs.push({
      change_points: log.change_point,
      action: log.action,
      time_zone: timeZone,
      update_time: log.last_update
    });
    json.licenses.push(licenseLogJson);
  } else {
    json.licenses[count - 1].logs.push({
      change_points: log.change_point,
      action: log.action,
      time_zone: timeZone,
      update_time: log.last_update
    });
  }
}

// generate response on multiple licenses
function buildSuccessResponseMultiple(timeZone, logs, pretty) {
  var resJson = {
    licenses: []
  };

  for (var i = 0; i < logs.length; i++) {
    appendLicenseLogToResponseJson(resJson, timeZone, logs[i]);
  }

  return stringifyJsonObj(resJson, pretty);
}

// retrieve license logs of specified license
function getLicenseLogSingle(req, res, sql) {
  var script = sqlScript.getLicenseLogByOrgAndLic(req.params.orgIdInt, req.params.licId);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else if (rows.length <= 0) {
      res.status(406).end(buildErrorResponseOnLicenses('406-05', [req.params.licId], req.query.pretty));
    } else {
      res.status(200).end(buildSuccessResponseSingle(req.params.timeZone, rows, req.query.pretty));
    }

    sql.release();
  });
}

// retrieve all license logs within the specified organization
function getLicenseLogMultiple(req, res, sql) {
  var script = sqlScript.getLicenseLogByOrg(req.params.orgIdInt);
  DIAG('SQL: ' + script);
  sql.query(script, function (err, rows) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else if (rows.length <= 0) {
      res.status(420).end('{ "UNDEF": "THERE ARE NOT ANY LOGS WITHIN THE ORGANIZATION" }'); // TODO: not defined
    } else {
      res.status(200).end(buildSuccessResponseMultiple(req.params.timeZone, rows, req.query.pretty));
    }

    sql.release();
  });
}

// access database to retrieve license logs
function perform(req, res, sql, callback) {
  // 1. check organization state
  var script = sqlScript.getOrganizationStateTimezone(req.params.orgId);
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
      req.params.orgIdInt = rows[0].id; // save organization id <internal int value>
      req.params.timeZone = rows[0].time_zone;
      callback(req, res, sql);
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

// API - get single license change log
function apiGetLicenseLogSingle(req, res) {
  implement(req, res, getLicenseLogSingle);
}

// API - get all license logs within specified organization-id
function apiGetLicenseLog(req, res) {
  implement(req, res, getLicenseLogMultiple);
}

module.exports.apiGetLicenseLogSingle = apiGetLicenseLogSingle;
module.exports.apiGetLicenseLog = apiGetLicenseLog;
