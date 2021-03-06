var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var apiDepositLicense = require('./api-deposit-license');
var apiServerStatus = require('./api-server-status');
var apiServerVersion = require('./api-server-version');
var apiLicenseInfo = require('./api-get-license-info');
var apiLicenseLog = require('./api-get-license-log');
var apiMigrateLicense = require('./api-migrate-license');
var apiEraseLicense = require('./api-erase-license');

// Deposit license
router.post('/organization/:orgId/licenses', apiDepositLicense);

// Get license change log
router.get('/organization/:orgId/licenses/:licId/logs', apiLicenseLog.apiGetLicenseLogSingle);
router.get('/organization/:orgId/licenses/logs', apiLicenseLog.apiGetLicenseLog);

// Get license info
router.get('/organization/:orgId/licenses/:licId', apiLicenseInfo.apiGetLicenseInfoSingle);
router.get('/organization/:orgId/licenses', apiLicenseInfo.apiGetLicenseInfo);

// Migrate license
router.put('/organization/:orgId/licenses/:licId', apiMigrateLicense);

// Erase license
router.delete('/organization/:orgId/licenses/:licId', apiEraseLicense);

// GET server status
router.get('/server/status', apiServerStatus);

// GET server version
router.get('/server/version', apiServerVersion);


module.exports = router;
