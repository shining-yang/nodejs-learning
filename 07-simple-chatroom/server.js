//
// Server side main process logic
//
var chatServer = require('./lib/chat_server');
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

function send404(res) {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.write('Error 404: resources not found');
    res.end();
}

function sendFile(res, file, content) {
    res.writeHead(200,
        {'Content-Type': mime.lookup(path.basename(file))}
    );
    res.end(content);
}

function serveStatic(res, cache, absPath) {
    if (cache[absPath]) {
        sendFile(res, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function (exists) {
            if (exists) {
                fs.readFile(absPath, function (err, data) {
                    if (err) {
                        send404(res);
                    } else {
                        cache[absPath] = data;
                        sendFile(res, absPath, data);
                    }
                });
            } else {
                send404(res);
            }
        });
    }
}

var server = http.createServer(function (req, res) {
    var file;
    if (req.url == '/') {
        file = 'public/index.html';
    } else {
        file = 'public' + req.url;
    }

    var absPath = './' + file;
    serveStatic(res, cache, absPath);
});

server.listen(4000, function () {
    console.log('Server running on port 4000');
});

chatServer.listen(server);
