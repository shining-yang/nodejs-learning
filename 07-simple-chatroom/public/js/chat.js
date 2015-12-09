// client-side javascript for chat-server

var Chat = function(socket) {
    this.socket = socket;
};

Chat.prototype.sendMessage = function(room, text) {
    this.socket.emit('message', {
        room: room,
        text: text
    });
};

Chat.prototype.changeRoom = function(room) {
    this.socket.emit('join', {
        newRoom: room
    });
};

Chat.prototype.changeNickname = function(name) {
    this.socket.emit('nameAttempt', {
        newNickname: name
    });
};

Chat.prototype.processCommand = function(command) {
    var words = command.split(' ');
    var command = words[0].substring(1, words[0].length).toLowerCase();
    var message = false;

    switch (command) {
        case 'join':
            words.shift();
            var room = words.join(' ');
            this.changeRoom(room);
            break;
        case 'nick':
            words.shift();
            var name = words.join(' ');
            this.changeNickname(name);
            break;
        default:
            message = 'Unrecognized command.';
            break;
    }

    return message;
};