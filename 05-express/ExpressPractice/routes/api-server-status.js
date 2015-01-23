//
// Get license server status
//

var mysql = require('mysql');

function apiServerStatus(req, res) {
  res.set('Content-Type', 'application/json');

  var sqlConn = mysql.createConnection({
    host: '192.168.113.132',
    port: 3306,
    user: 'root',
    password: '111111',
    database: 'license'
  });
    
  console.log('Connecting mysql ...');

  sqlConn.connect(function(err) {
    if (err) {
      var resJson = {
        status: 'error',
        errors: {
          code: '420-02',
          messages: 'Method Failure. The database is disconnected'
        }
      };
      
      if (req.query.pretty == 'true') {
        res.status(420).end(JSON.stringify(resJson, null, 3));
      } else {
        res.status(420).end(JSON.stringify(resJson));
      }
      return;
    }
    
    sqlConn.end();
    
    var resJson = {
      status: 'ok'
    };
    
    if (req.query.pretty == 'true') {
      res.status(200).end(JSON.stringify(resJson, null, 3));
    } else {
      res.status(200).end(JSON.stringify(resJson));
    }
  });
}

module.exports = apiServerStatus;