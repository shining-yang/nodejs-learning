//
// Get license server status
//

var mysql = require('mysql');
var mysqlOptions = {
  host: '192.168.154.130',
  port: 3306,
  user: 'root',
  password: '111111',
  database: 'license'
};

// stringify json object
function stringifyJsonObj(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 2) + '\n';
  } else {
    return JSON.stringify(json) + '\n';
  }
}

function apiServerStatus(req, res) {
  var sql = mysql.createConnection(mysqlOptions);
  res.set('Content-Type', 'application/json');
  sql.connect(function (err) {
    if (err) {
      res.status(420).end(stringifyJsonObj({
        status: 'error',
        errors: {
          code: '420-02',
          messages: 'Method Failure. The database is disconnected'
        }
      }, req.query.pretty));
    } else {
      sql.end();
      res.status(200).end(stringifyJsonObj({
        status: 'ok'
      }, req.query.pretty));
    }
  });
}

module.exports = apiServerStatus;
