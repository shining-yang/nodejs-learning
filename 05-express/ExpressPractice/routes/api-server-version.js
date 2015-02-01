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
  res.set('Content-Type', 'application/json');
  res.status(200).end(stringifyJsonObj({
    software_version: '2.x',
    api_version: '0.7.0'
  }, req.query.pretty));
}

module.exports = apiServerVersion;
