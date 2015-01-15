/**
 * create organiztion
 * Shining Yang <y.s.n@live.com>, 2015-01-08
 */

var util = require('util');
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

router.post('/', function(req, res) {
	var result = {
		errors: {
			organization_id: 'ORG-ID-CHN',
			code: '409-01',
			message: 'Conflict. Duplicated organization'
		}
	};

	console.log(req.body);
	res.status(200).send(JSON.stringify(result, null, 3));
});

router.delete('/:org', jsonParser, function(req, res) {
	var result = {
		errors: {
			code: '409-02',
			message: 'Not acceptable'
		}
	};

	console.log(req.params);
	console.log('The input org is: ', req.params.org);
	res.status(400).end(JSON.stringify(result, null, 3));
});

module.exports = router;
