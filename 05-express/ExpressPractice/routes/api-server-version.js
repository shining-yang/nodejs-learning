//
// Get the version info of License Server
//

function apiServerVersion(req, res) {
  var resJson = {
    version: '2.x'
  };

  if (req.query.pretty == "true") {
    res.status(200).end(JSON.stringify(resJson, null, 3));
  } else {
    res.status(200).end(JSON.stringify(resJson));
  }
}

module.exports = apiServerVersion;