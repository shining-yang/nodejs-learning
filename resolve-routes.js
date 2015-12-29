//
// Test how routes are resolved
// 2015-12-29
//

var url = require('url');

var routes = {
  GET: {
    '/': function (req, res) {
      console.log('Route to GET /');
    },
    '/orders': function (req, res) {
      console.log('Route to GET /order');
    },
    '/statistics/:id': function (req, res, id) {
      console.log('Route to GET /statistics/:id - ', id);
    }
  },
  POST: {
    '/login': function (req, res) {
      console.log('Route to POST /login');
    },
    '/logout': function (req, res) {
      console.log('Route to POST /logout');
    }
  },
  DELETE: {
    '/employee/:com/:id': function (req, res, com, id) {
      console.log('Route to DELETE /employee/:com/:id - ', com, id);
    }
  }
};

function route(obj) {
  return function (req, res, next) {
    if (!obj[req.method]) {
      next();
      return;
    }

    var routes = obj[req.method];
    var paths = Object.keys(routes);
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i];
      var func = routes[path];

      path = path.replace(/\//g, '\\/').replace(/:\w+/g, '([^\\/]+)');

      var re = new RegExp('^' + path + '$');
      var pathname = url.parse(req.url).pathname;
      var captures = pathname.match(re);
      if (captures) {
        var s = captures.slice(1);
        var args = [req, res].concat(captures.slice(1));
        func.apply(null, args);
        return;
      }
    }
  }
}

function testOnCallback(cb) {
  cb({
    url: 'http://foo.bar.com/statistics/8100?pretty=true',
    method: 'GET'
  }, {
  }, function() {
    console.log('Fall into next one.');
  });

  cb({
    url: 'http://www.microsoft.com/employee/ms/15031273?confirmed=true',
    method: 'DELETE'
  }, {}, function() {});
}

(function test() {
  testOnCallback(route(routes));
})();