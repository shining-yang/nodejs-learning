//
// API - Get the version info of License Server
//

// stringify json object
function stringifyJsonObj(json, pretty) {
  if (pretty === 'true') {
    return JSON.stringify(json, null, 2) + '\n';
  } else {
    return JSON.stringify(json) + '\n';
  }
}

// API: get server version
function apiServerVersion(req, res) {
  var resJson = {
    version: '2.x'
  };

  res.set('Content-Type', 'application/json');
  res.status(200).end(stringifyJsonObj(resJson, req.query.pretty));
}

module.exports = apiServerVersion;