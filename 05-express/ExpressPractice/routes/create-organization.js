/**
 * create organiztion
 * Shining Yang <y.s.n@live.com>, 2015-01-08
 */

var util = require('util');
var express = require('express');
var router = express.Router();

router.post('/', function(req, res) {
	var result = {
		errors: {
			organization_id: 'ORG-ID-CHN',
			code: '409-01',
			message: 'Conflict. Duplicated organization'
		}
	};

	console.log(util.inspect(req));
	res.status(200).send(JSON.stringify(result, null, 3));
});

module.exports = router;
