//
// Get license info
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

function apiGetLicenseInfo(req, res) {
  mysqlPool.getConnection(function (err, sqlConn) {
    if (err) {
      res.status(420).end(buildErrorResponse('420-02', req.query.pretty));
    } else {
      // 1. check organization state
      var sql = getSqlCheckOrganization(req.params.orgId);
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
        } else if (rowsOrg[0].state == 'removed') {
          res.status(406).end(buildErrorResponse('406-13', req.query.pretty));
          sqlConn.release();
        } else {

        }
      });
    }
  });
}

module.exports = apiGetLicenseInfo;