var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var apiDepositLicense = require('./api-deposit-license');
var apiServerStatus = require('./api-server-status');
var apiServerVersion = require('./api-server-version');
var apiLicenseInfo = require('./api-get-license-info');
var apiLicenseLog = require('./api-get-license-log');

// Deposit license
router.post('/organization/:orgId/licenses', apiDepositLicense);

// Get license info
router.get('/organization/:orgId/licenses/:licId', apiLicenseInfo.apiGetLicenseInfoSingle);
router.get('/organization/:orgId/licenses', apiLicenseInfo.apiGetLicenseInfo);

// Get license change log
router.get('/organization/:orgId/licenses/:licId', apiLicenseLog.apiGetLicenseLogSingle);
router.get('/organization/:orgId/licenses', apiLicenseLog.apiGetLicenseLog);

// GET server status
router.get('/server/status', apiServerStatus);

// GET server version
router.get('/server/version', apiServerVersion);


module.exports = router;
