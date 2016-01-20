var http = require('http');
var path = require('path');
var express = require('express');
var app = express();
var server = http.createServer(app);
var cp = require("child_process");
var sio = require("socket.io");

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET', 'POST');
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.use(express.static(path.resolve(__dirname, 'dist')));

var io = sio.listen(server, {
    log: false,
    origins: '*:*'
});

var port = process.env.PORT || 3000;
server.listen(port, function() {
    console.log("Server listening on " + port);
});

io.on('connection', function(client) {

    var child = cp.fork('./worker');
    client.on('do-task', function(messageObj) {
        child.send(messageObj);
    });

    child.on('message', function(workersMessage) {
        client.emit('message', workersMessage);
    });

});