var express = require('express');
var router = express.Router();

var apiDepositLicense = require('./api-deposit-license');
var apiServerStatus = require('./api-server-status');
var apiServerVersion = require('./api-server-version');

// Deposit license
router.post('/organization/:orgId/licenses', apiDepositLicense);

// GET server status
router.get('/server/status', apiServerStatus);

// GET server version
router.get('/server/version', apiServerVersion);


module.exports = router;
