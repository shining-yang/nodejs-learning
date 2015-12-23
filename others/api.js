//
// simple api test
//
var http = require('http');


var hostname = 'stage.itis6am.com';
//var hostname = '120.24.168.89';
var pathname = '/apiWXTeacher/v1/wxMain';

var postData = {
  account: 'testwl',
  password: 'e10adc3949ba59abbe56e057f20f883e',
  openId: 'my-random-one',
  client: '1',
  method: 'login'
};

var options = {
  hostname: hostname,
  port: 80,
  path: pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'applicaton/json',
    'Content-Length': Buffer.byteLength(JSON.stringify(postData))
  }
};

function performLogin(callback) {
  var postData = {
    account: 'testwl',
    password: 'e10adc3949ba59abbe56e057f20f883e',
    openId: 'my-random-one',
    client: '1',
    method: 'login'
  };

  var options = {
    hostname: hostname,
    port: 80,
    path: pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'applicaton/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    }
  };

  var req = http.request(options, function (res) {
    console.log('HTTP STATUS: ', res.statusCode);
    res.setEncoding('utf-8');

    res.on('data', function (data) {
      var json = JSON.parse(data);
      if (json.code == 1) {
        console.log(JSON.stringify(json, null, 2));
        callback(json.data.openId);
      } else {
        console.log('Failed to login.');
      }
    });

    res.on('end', function () {
      console.log('Finished login.');
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
    headers: {
      'Content-Type': 'applicaton/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(postData))
    }
  };

  var req = http.request(options, function (res) {
    console.log('HTTP STATUS: ', res.statusCode);
    res.setEncoding('utf-8');

    res.setEncoding('utf-8');
    res.on('data', function (data) {
      var json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    });

    res.on('end', function () {
      console.log('Finished getting info.');
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
