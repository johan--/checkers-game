var model = require('./model.js');

var io;

var _roomList = {};
var players = {};
var sessions = {};

var admins = {};

exports.init = function(server, cb) {
  model.room.getRoomList(function(roomList) {
    for(var i = 0 ; i < roomList.length ; i++) {
      var room_name  = 'room' + roomList[i]._id;
      _roomList[room_name] = roomList[i];
      players[room_name] = {};
      sessions[room_name] = {};
    }
    io = require('socket.io')(server, {
      'transports': ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']
    });
    io.sockets.on('connection', function (socket) {

      socket.on('addUser', function (user, room) {
        try {
          var address = socket.handshake.address;
          socket.address = address;
          socket.user = user;
          socket.room = room;
          if (socket.room !== '') {
            userJoinRoom(socket);
          }
          adminUpdateClients();
        } catch (e) {
          logError('*** Catched error on addUser : ' + e.toString() + ' ***');
        }
      });

      socket.on('updateUser', function (key, value) {
        try {
          socket.user[key] = value;
        } catch (e) {
          logError('*** Catched error on updateUser : ' + e.toString() + ' ***');
        }
      });

      socket.on('addAdmin', function () {
        try {
          var address = socket.handshake.address;
          admins[socket.id] = {address: address};
          adminUpdateClients();
        } catch (e) {
          logError('*** Catched error on addAdmin : ' + e.toString() + ' ***');
        }
      });

      socket.on('sendChat', function (data) {
        try {
          io.sockets.in(socket.room).emit('updateChat', socket.user.user_name, data);
        } catch (e) {
          logError('*** Catched error on sendChat : ' + e.toString() + ' ***');
        }
      });

      socket.on('joinRoom', function (room, cb) {
        try {
          socket.room = room;
          userJoinRoom(socket);
          adminUpdateClients();
          cb();
        } catch (e) {
          logError('*** Catched error on join_room : ' + e.toString() + ' ***');
        }
      });

      socket.on('leaveRoom', function () {
        try {
          userLeaveRoom(socket);
          adminUpdateClients();
        } catch (e) {
          logError('*** Catched error on leaveRoom : ' + e.toString() + ' ***');
        }
      });

      socket.on('joinSession', function (session_info) {
        try {
          userJoinSession(socket, session_info);
          //adminUpdateSessions();
        } catch (e) {
          logError('*** Catched error on joinSession : ' + e.toString() + ' ***');
        }
      });

      socket.on('leaveSession', function (session_info) {
        try {
          userLeaveSession(socket, session_info);
        } catch (e) {
          logError('*** Catched error on leaveSession : ' + e.toString() + ' ***');
        }
      });

      socket.on('selectUser', function (user_id) {
        try {
          var user = players[socket.room][user_id];
        } catch (e) {
          logError('*** Catched error on selectUser : ' + e.toString() + ' ***');
        }
      });

      socket.on('updateGame', function (user_id) {
        try {
          if (socket.room != '') {
            if (socket.room in players) {
              if (user_id in players[socket.room])
                io.sockets.socket(players[socket.room][user_id]['socket_id']).emit('updateGame');
            } else {
              logError('*** Unexpected value for socket.room in updateGame : ' + socket.room + ' ***');
            }
          }
        } catch (e) {
          logError('*** Catched error on updateGame : ' + e.toString() + ' ***');
        }
      });

      socket.on('informAction', function (action_info) {
        try {
          //logWarn('action_info received in informAction : '+action_info);
          if (socket.room != '') {
            if (socket.room in players) {
              if (action_info.user_id in players[socket.room]) {
                var id = players[socket.room][action_info.user_id]['socket_id'];
                io.sockets.connected[id].emit('updateGame');
              }
            } else {
              logError('*** Unexpected value for socket.room in informAction : ' + socket.room + ' ***');
            }
          }
          io.sockets.in(socket.room).emit('updatePlayAction', action_info);
        } catch (e) {
          logError('*** Catched error on informAction : ' + e.toString() + ' ***');
        }
      });

      socket.on('disconnect', function () {
        try {
          if (socket.id in admins) {
            delete admins[socket.id];
          } else {
            if (socket.room != '') {
              userLeaveRoom(socket);
              socket.user = {};
            }
            setTimeout(adminUpdateClients, 100);
          }
        } catch (e) {
          logError('*** Catched error on disconnect : ' + e.toString() + ' ***');
        }
      });

      socket.on('getClientsList', function (returnData)
      {
        try {
          var sockets = io.sockets.connected;
          var clients = {};
          for (socket_id in sockets) {
            clients[socket_id] = {address: sockets[socket_id].address, user: sockets[socket_id].user, room: sockets[socket_id].room};
          }
          returnData(clients);
        } catch (e) {
          logError('*** Catched error in getClientsList : ' + e.toString() + ' ***');
        }
      });

    });
    cb();
  });
  
};

exports.getRoomList = function() {
  return _roomList;
};

exports.getRoomInfo = function(room_name) {
  return _roomList[room_name];
};

exports.getUserList = function(room_name) {
  return room_name ? players[room_name] : players;
};

exports.getGameList = function(room_name) {
  return room_name ? sessions[room_name] : sessions;
};























function logError(errorMsg) {
  console.log(new Date().toISOString().slice(0, 19).replace('T', ' ') + ' ' + errorMsg);
}

function logWarn(warnMsg) {
  console.warn(new Date().toISOString().slice(0, 19).replace('T', ' ') + ' ' + warnMsg);
}

function adminUpdateClients() {
  try {
    var sockets = io.sockets.connected;
    var clients = {};
    for (var socket_id in sockets) {
      if (socket_id in admins) {
        clients[socket_id] = {address: admins[socket_id].address, admin: 1};
      } else {
        clients[socket_id] = {address: sockets[socket_id].address, admin: 0, user: sockets[socket_id].user, room: sockets[socket_id].room};
      }
    }
    for (var socket_id in admins) {
      io.sockets.connected[socket_id].emit('updateClients', clients, players, sessions);
    }
  } catch (e) {
    logError(' *** Catched error in adminUpdateClients : ' + e.toString() + ' ***');
  }
}

function getPlayersNumb(room) {

  var numb = 0;
  for (var player_id in players[room])
    ++numb;
  return numb;

}

function getSessionsNumb(room) {

  var numb = 0;
  for (var session_id in sessions[room])
    ++numb;
  return numb;

}

function checkPlayersList(room) {
  try {
    var sockets = io.sockets.connected;
    var clients = {};
    for (socket_id in sockets) {
      clients[socket_id] = {address: sockets[socket_id].address, room: sockets[socket_id].room};
    }
    for (user_id in players[room]) {
      var socket_id = players[room][user_id]['socket_id'];
      if (!(socket_id in clients)) {
        logWarn('*** player ' + players[room][user_id]['user_login'] + ' with id #' + user_id + ' is no longer in the node clients list ***');
        delete players[room][user_id];
      } else if (clients[socket_id]['room'] != room) {
        logWarn('*** player ' + players[room][user_id]['user_login'] + ' with id #' + user_id + ' is the node clients list but has changed room ***');
        delete players[room][user_id];
      }
    }
  } catch (e) {
    logError('*** Catched error in checkPlayersList : ' + e.toString() + ' ***');
  }
}

function userJoinRoom(socket) {
  try {
    socket.join(socket.room);
    if (socket.user) {
      players[socket.room][socket.user._id] = socket.user;
      players[socket.room][socket.user._id]['socket_id'] = socket.id;
      players[socket.room][socket.user._id]['in_session'] = 0;
      console.log('players',players);
    }
    broadcastUserList(socket);
  } catch (e) {
    logError('*** Catched error in userJoinRoom : ' + e.toString() + ' ***');
  }
}

function userLeaveRoom(socket) {
  try {
    if (socket.room !== '') {
      if (socket.user) {
        for (var session_id in sessions[socket.room]) {
          var session_info = sessions[socket.room][session_id];
          if (sessions[socket.room][session_id].from_user_id == socket.user.user_id || sessions[socket.room][session_id].dest_user_id == socket.user.user_id) {
            if (session_info.from_user_id == socket.user.user_id && session_info.dest_user_id in players[socket.room]) {
              players[socket.room][session_info.dest_user_id]['in_session'] = 0;
            }
            if (session_info.dest_user_id == socket.user.user_id && session_info.from_user_id in players[socket.room]) {
              players[socket.room][session_info.from_user_id]['in_session'] = 0;
            }
            delete sessions[socket.room][session_id];
          }
        }
        delete players[socket.room][socket.user.user_id];
        broadcastUserList(socket);
      }
      socket.leave(socket.room);
      socket.room = '';
    }
  } catch (e) {
    logError('*** Catched error in userLeaveRoom : ' + e.toString() + ' ***');
  }
}

function userJoinSession(socket, session_info) {
  try {
    var session_id = session_info['session_id'];
    session_info.session_status = 3;
    sessions[socket.room][session_id] = session_info;
    if (session_info.from_user_id in players[socket.room])
      players[socket.room][session_info.from_user_id]['in_session'] = 1;
    if (session_info.dest_user_id in players[socket.room])
      players[socket.room][session_info.dest_user_id]['in_session'] = 1;
    broadcastUserList(socket);
  } catch (e) {
    logError('*** Catched error in userJoinSession : ' + e.toString() + ' ***');
  }
}

function userLeaveSession(socket, session_info) {
  try {
    var session_id = session_info['session_id'];
    delete sessions[socket.room][session_id];
    if (session_info.from_user_id in players[socket.room])
      players[socket.room][session_info.from_user_id]['in_session'] = 0;
    if (session_info.dest_user_id in players[socket.room])
      players[socket.room][session_info.dest_user_id]['in_session'] = 0;
    broadcastUserList(socket);
  } catch (e) {
    logError('*** Catched error in userLeaveSession : ' + e.toString() + ' ***');
  }
}

function broadcastUserList(socket) {
  try {
    checkPlayersList(socket.room);
    io.sockets.in(socket.room).emit('updateUserList', players[socket.room], sessions[socket.room]);
    //socket.broadcast.emit('updateRoomInfo', socket.room, getPlayersNumb(room), getSessionsNumb(room));
  } catch (e) {
    logError('*** Catched error in broadcastUserList : ' + e.toString() + ' ***');
  }
}

