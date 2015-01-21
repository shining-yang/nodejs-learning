//
// Get license server status
//

function apiServerStatus(req, res) {
  var resJson = {
    status: 'ok'
  };
  
  if (req.query.pretty == "true") {
    res.status(200).end(JSON.stringify(resJson, null, 3));
  } else {
    res.status(200).end(JSON.stringify(resJson));
  }
}

module.exports = apiServerStatus;