//
// Build sql scripts
//
var mysql = require('mysql');

// get all info about the specified organization
function getOrganizationInfoByName(orgName) {
  var sql = 'SELECT * FROM organization WHERE name = ?';
  var para = [orgName];
  return mysql.format(sql, para);
}

// get state of organization
function getOrganizationState(orgName) {
  var sql = 'SELECT id, state FROM organization WHERE name = ?';
  var para = [orgName];
  return mysql.format(sql, para);
}

// get organization info: state, time-zone
function getOrganizationStateTimezone(orgName) {
  var sql = 'SELECT id, state, time_zone FROM organization WHERE name = ?';
  var para = [orgName];
  return mysql.format(sql, para);
}

// check whether licenses exist or not
function checkLicenseExistence(requests, appId) {
  var sql = 'SELECT * FROM license_generator WHERE license_id IN (';
  for (var i = 0; i < requests.length; i++) {
    if (i > 0) {
      sql += ', '; // append comma
    }
    sql += '\'';
    sql += requests[i].license_id;
    sql += '\'';
  }
  sql += ')';

  sql += ' AND app_id = \'';
  sql += appId;
  sql += '\'';

  return sql;
}

// check whether licenses already been used by someone else （取集合交集）
function checkLicenseUsablity(requests) {
  var sql = 'SELECT id FROM (';
  for (var i = 0; i < requests.length; i++) {
    if (i > 0) {
      sql += ' UNION ';
    }
    sql += '(SELECT \'';
    sql += requests[i].license_id;
    sql += '\' AS id)';
  }
  sql += ') AS yourID';
  sql += ' INNER JOIN ';
  sql += '((SELECT id FROM license) UNION (SELECT id FROM license_history)) AS ourID';
  sql += ' USING (id)';

  return sql;
}

// construct sql script to deposit licenses
function insertDepositLicense(orgId, requests, licenses) {
  var sql = 'INSERT INTO license';
//  sql += ' (id, organization_id, user_id, original_point, remaining_point, po_number, bill_to, expiration, last_update)';
  sql += ' VALUES ';

  for (var i = 0; i < requests.length; i++) {
    if (i > 0) {
      sql += ',';
    }

    var idx = -1;
    for (var n = 0; n < licenses.length; n++) {
      if (requests[i].license_id === licenses[n].license_id) {
        idx = n;
        break;
      }
    }

    {
      {
        {
          console.log('>>>>>> i: %d, idx: %d', i, idx);
        }
      }
    }

    if (idx < 0) {
      throw new Error({msg: 'Should not happen'});
    }

    var insertSql = '(?, ?, ?, ?, ?, ?, ?, ?, ?)';
    var insertPara = [
      requests[i].license_id, orgId, requests[i].deposited_by,
      licenses[idx].points, licenses[idx].points, licenses[idx].pk_number,
      licenses[idx].obu, 6, '0000-00-00 00:00:00'
    ];

    sql += mysql.format(insertSql, insertPara);
  }

  return sql;
}

// generate script for license log (after deposit)
function insertDepositLicenseLog(orgId, licenses) {
  var sql = 'INSERT INTO license_log';
  sql += ' (license_id, organization_id, billing_id, change_point, action, last_update)';
  sql += ' VALUES ';

  for (var i = 0; i < licenses.length; i++) {
    if (i > 0) {
      sql += ',';
    }

    var insertSql = '(?, ?, ?, ?, ?, ?)';
    var insertPara = [
      licenses[i].license_id, orgId, 0, licenses[i].points, 'deposit',
      '0000-00-00 00:00:00'
    ];

    sql += mysql.format(insertSql, insertPara);
  }

  return sql;
}

// get billing cycle for organization
function getBillingCycle(orgId) {
  var sql = '';
  sql += 'SELECT cycle FROM billing_profile WHERE id = (';
  sql += 'SELECT profile_id FROM organization_group WHERE id = (';
  sql += 'SELECT group_id FROM organization WHERE id = ?))';

  return mysql.format(sql, [orgId]);
}

// get license info with specified organization-id & license-id
function getLicenseInfoWithId(orgId, licId) {
  var what = '(SELECT id, organization_id, user_id, original_point, remaining_point, expiration, last_update FROM ';
  var where = ' WHERE organization_id = ? AND id = ?)';
  var sql = '';
  sql += what;
  sql += 'license';
  sql += where;
  sql += ' UNION ';
  sql += what;
  sql += 'license_history';
  sql += where;

  return mysql.format(sql, [orgId, licId, orgId, licId]);
}

// get all licenses within the organization
function getLicenseInfo(orgId) {
  var what = '(SELECT id, organization_id, user_id, original_point, remaining_point, expiration, last_update FROM ';
  var where = ' WHERE organization_id = ?)';

  var sql = '';
  sql += what;
  sql += 'license';
  sql += where;
  sql += ' UNION ';
  sql += what;
  sql += 'license_history';
  sql += where;

  return mysql.format(sql, [orgId, orgId]);
}

// get all license change logs with specified organization-id & license-id
// ALSO retrieve license-remaining-point
function getLicenseLogByOrgAndLic(orgId, licId) {
  var sql = '';
  sql += 'SELECT L.license_id, L.remaining_point, LOG.change_point, LOG.action, LOG.last_update FROM (';
  sql += '(';
  sql += ' SELECT id AS license_id, organization_id, remaining_point';
  sql += ' FROM license WHERE organization_id = ? AND id = ?';
  sql += ')';
  sql += ' UNION ';
  sql += '(';
  sql += ' SELECT id AS license_id, organization_id, remaining_point';
  sql += ' FROM license_history WHERE organization_id = ? AND id = ?';
  sql += ')';
  sql += ') AS L, license_log AS LOG';
  sql += ' WHERE L.license_id = LOG.license_id AND L.organization_id = LOG.organization_id';
  sql += ' ORDER BY LOG.last_update ASC';

  return mysql.format(sql, [orgId, licId, orgId, licId]);
}

// get all change logs of all licenses within the organization
// ALSO retrieve license-remaining-point
function getLicenseLogByOrg(orgId) {
  var sql = '';
  sql += 'SELECT L.license_id, L.remaining_point, LOG.change_point, LOG.action, LOG.last_update FROM (';
  sql += '(';
  sql += ' SELECT id AS license_id, organization_id, remaining_point';
  sql += ' FROM license WHERE organization_id = ?';
  sql += ')';
  sql += ' UNION ';
  sql += '(';
  sql += ' SELECT id AS license_id, organization_id, remaining_point';
  sql += ' FROM license_history WHERE organization_id = ?';
  sql += ')';
  sql += ') AS L, license_log AS LOG';
  sql += ' WHERE L.license_id = LOG.license_id AND L.organization_id = LOG.organization_id';
  sql += ' ORDER BY LOG.license_id ASC, LOG.last_update ASC';

  return mysql.format(sql, [orgId, orgId]);
}


module.exports.getOrganizationInfoByName = getOrganizationInfoByName;
module.exports.getOrganizationState = getOrganizationState;
module.exports.getOrganizationStateTimezone = getOrganizationStateTimezone;
module.exports.checkLicenseUsablity = checkLicenseUsablity;
module.exports.checkLicenseExistence = checkLicenseExistence;
module.exports.insertDepositLicense = insertDepositLicense;
module.exports.insertDepositLicenseLog = insertDepositLicenseLog;
module.exports.getBillingCycle = getBillingCycle;
module.exports.getLicenseInfoWithId = getLicenseInfoWithId;
module.exports.getLicenseInfo = getLicenseInfo;
module.exports.getLicenseLogByOrgAndLic = getLicenseLogByOrgAndLic;
module.exports.getLicenseLogByOrg = getLicenseLogByOrg;



