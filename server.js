var http = require('http');
var path = require('path');
var async = require('async');
var express = require('express');
var router = express();
var server = http.createServer(router);
var cp = require("child_process");
var sio = require("socket.io");

router.use(express.static(path.resolve(__dirname, 'dist')));

var io = sio.listen(server);

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
    console.log("Server listening...");
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