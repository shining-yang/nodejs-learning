//
// simple api test
//
var http = require('http');

var hostname = 'stage.itis6am.com';
//var hostname = '120.24.168.89';
var pathname = '/apiWXTeacher/v1/wxMain';


function performLogin(callback) {
  var postData = {
    account: 'testwl',
    password: 'e10adc3949ba59abbe56e057f20f883e',
    openId: '我的OPEN-ID',
    client: '1',
    method: 'login'
  };

  var options = {
    hostname: hostname,
    port: 80,
    path: pathname,
    method: 'POST',
    //headers: {
    //  'Content-Type': 'applicaton/json',
    //  'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    //}
  };

  var req = http.request(options, function (res) {
    console.log('HTTP STATUS: ', res.statusCode);
    res.setEncoding('utf-8');

    var reply;
    res.on('data', function (chunk) {
      if (reply) {
        reply = Buffer.concat([reply, chunk]);
      } else {
        reply = chunk;
      }
    });

    res.on('end', function () {
      var json = JSON.parse(reply);
      if (json.code == 1) {
        console.log(JSON.stringify(json, null, 2));
        callback(json.data.openId);
      } else {
        console.log('Failed to login.');
      }
    });

    res.on('error', function (err) {
    });
  });

  req.write(JSON.stringify(postData));
  req.end();
}

function getOrderAmountInfo(openId) {
  var postData = {
    openId: openId,
    client: '1',
    method: 'getTeacherCourseInfo',//'getTeacherOrderStatisticInfo',//'getTeacherInfo',//'getTeacherOrderInfo',
    orderStatus: '1',
    orderDate: '2015-10-28'
  };

  var options = {
    hostname: hostname,
    port: 80,
    path: pathname,
    method: 'POST',
    //headers: {
    //  'Content-Type': 'applicaton/json',
    //  'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    //}
  };

  var req = http.request(options, function (res) {
    console.log('HTTP STATUS: ', res.statusCode);
    res.setEncoding('utf-8');

    var reply;
    res.on('data', function (chunk) {
      if (reply) {
        reply = Buffer.concat([reply, chunk]);
      } else {
        reply = chunk;
      }
    });

    res.on('end', function () {
      var json = JSON.parse(reply);
      if (json.code == 1) {
        console.log(JSON.stringify(json, null, 2));
        callback(json.data.openId);
      } else {
        console.log('Failed to request.');
      }
    });

    res.on('error', function (err) {
    });
  });

  req.write(JSON.stringify(postData));
  req.end();
}


module.exports = function () {
  performLogin(getOrderAmountInfo);
};
