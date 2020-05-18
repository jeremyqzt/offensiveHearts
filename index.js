var express = require('express');
var bodyParser = require("body-parser");
var session = require('express-session');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var adaptor = require('./gameServerAdaptor');
var lobbyClass = require('./lobby');

var serverAdaptor = new adaptor.gameServerAdaptor()
var lobbies = new lobbyClass.lobbyRoom();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: true, saveUninitialized: true }));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("start");
});

app.get('/lobby/:rid/pid/:pid/name/:name', function (req, res) {
  var rid = req.params.rid;
  var pid = req.params.pid;
  var name = req.params.name;
  var admin = lobbies.isPlayerAdmin(pid, rid);
  var fullUrl = req.protocol + '://' + req.get('host');

  var roomCtx = {
    rid: rid,
    pid: pid,
    name: name,
    admin: admin,
    url: fullUrl,
  };
  res.render("lobby", { roomCtx: roomCtx });
})

app.get('/game/:rid/pid/:pid/name/:name', function (req, res) {
  var rid = req.params.rid;
  var pid = req.params.pid;
  var name = req.params.name;

  if (!(serverAdaptor.okayToJoin(rid, pid, name))){
    return res.redirect('/');
  }
  var roomInfo = { rid:rid, pid: pid, name:name };
  res.render("game", { info: roomInfo });

})

app.post("/createRoom", function (req, res) {
  var name = req.body.name;
  var room = req.body.roomId;
  if (room == "") {
    room = lobbies.createLobby();
  } else {
    room = lobbies.createLobbyIfNotExist(room);
  }
  var validName = lobbies.getValidName(name, room);
  var pid = lobbies.addPlayerToLobby(validName, room);
  res.redirect(`/lobby/${room}/pid/${pid}/name/${validName}`)
});

app.get('/gameOver', function (req, res) {
  res.sendFile(__dirname + '/public/winner.html');
});

app.get('/credits', function (req, res) {
  res.sendFile(__dirname + '/public/authors.html');
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

app.all('*', function (req, res) {
  return res.redirect(req.baseUrl);
});

var sockRooms = {};

io.on('connection', (socket) => {

  socket.on('disconnect', () => {
    var room = serverAdaptor.getRoom(socket);
    var player = serverAdaptor.getPlayer(socket);
    try {
      io.to(room).emit('chat', `${player} has left the room!`);
      serverAdaptor.leaveRoom(socket);
    } catch (e) {
      //console.log(e);
    }
  });

  socket.on('startGame', (rid, pid) => {
    if (lobbies.isPlayerAdmin(pid, rid)){
      lobbies.setRoomAsStarted(rid);
      var handover = lobbies.getGameHandOver(rid);
      serverAdaptor.setLobbyHandoverData(handover, rid);
      io.to(rid).emit('redirectStart');
    }
  });

  socket.on('removePlayer', (rid, pid, toKick) => {
    if ((lobbies.isPlayerAdmin(pid, rid)) ||            //Admin
       (lobbies.getPlayerFromPid(rid, pid) == toKick)){ //Volunteer to leave

      var toLeavePid = lobbies.getPidByName(rid, toKick);

      if (lobbies.isPlayerAdmin(toLeavePid, rid)){ //If Admin, kick everyone
        var allPlayers = lobbies.getAllPlayers(rid);
        for (var i in allPlayers){
          io.to(rid).emit('remove', allPlayers[i].name);
        }
      }

      if (lobbies.removePlayerFromLobby(rid, toLeavePid)){  //Otherwise, just remove the player
        io.to(rid).emit('remove', toKick);
        var allPlayers = lobbies.getAllPlayers(rid);
        io.to(rid).emit('playerEnumeration', allPlayers);
      }
    }
  });

  socket.on('lobbyJoin', (rid, pid) => {
    var valid = lobbies.isPidValid(pid, rid);
    if (valid) {
      lobbies.joinLobby(socket, pid, rid);
    } else {
      io.to(socket.id).emit("goHome");
    }
    var allPlayers = lobbies.getAllPlayers(rid);
    io.to(rid).emit('playerEnumeration', allPlayers);
  });

  socket.on('join', (rid, pid, pName) => {
    console.log(`${pName} has joined the ${rid}!`)
    serverAdaptor.joinRoom(rid, pid, pName, socket);
    io.to(rid).emit('chat', pName + " has joined the room!");
    updateScore(socket, rid);
    removeStale(rid);
  });

  socket.on('flipReq', (row, col, pid) => {
    var room = serverAdaptor.getRoom(socket);
    let toFlip = `#R${row}C${col}`;
    var actions = serverAdaptor.getGame(room).flipCard(row, col, pid);

    if (actions.toFlip != null) {
      io.to(room).emit('serverFlip', toFlip, "/img/" + actions.toFlip.imageName, true, pid);
      postFlipActions(actions, socket, pid, room);
    }
  });

  socket.on('tease', (rowLength, colLength) => {
    var room = serverAdaptor.getRoom();
    var game = serverAdaptor.getGame(room);
    var pid = serverAdaptor.getPid(socket);
    console.log(game);

    if (!(game.demoedAlready(pid))){
      var first = true;
      for (x = 1; x <= rowLength; x++) {
        for (y = 1; y <= colLength; y++) {
          tease(socket, x, y, first);
          first = false;
        }
      }

      first = true;
      for (x = 1; x <= rowLength; x++) {
        for (y = 1; y <= colLength; y++) {
          teaseOver(socket, x, y, first);
          first = false;
        }
      }
    }
  });

  async function tease(socket, row, col, first) {
    var room = serverAdaptor.getRoom(socket);
    var pid = serverAdaptor.getPid(socket);
    let toFlip = `#R${row}C${col}`;
    if (first){
      serverAdaptor.getGame(room).startDemo(pid);
    }
    var actions = serverAdaptor.getGame(room).flipCardDemo(row, col);
    if (actions != null){
      io.to(socket.id).emit('serverFlip', toFlip, "/img/" + actions.imageName, true, null);
    }
  }

  async function teaseOver(socket, row, col, first) {
    var room = serverAdaptor.getRoom(socket);
    var pid = serverAdaptor.getPid(socket);
    let toFlip = `#R${row}C${col}`;
    await new Promise(r => setTimeout(r, 5000));
    io.to(socket.id).emit('serverFlip', toFlip, "/img/back.png", false, null);
    if (first){
      serverAdaptor.getGame(room).endDemo();
    }

  }

  socket.on('chat', (player, msg) => {
    var room = serverAdaptor.getRoom(socket);
    io.to(room).emit('chat', player + ": " + msg);
  });

  async function postFlipActions(actions, sock, name, room) {
    //return;
    var game = serverAdaptor.getGame(room);
    if (actions.toFlipDisappear.length > 0) {
      updateScore(sock, room);
    }

    await new Promise(r => setTimeout(r, 500));
    var toFlip = "";
    for (var i = 0; i < actions.toFlipDelay.length; i++) {
      toFlip = "#R" + actions.toFlipDelay[i].row + "C" + actions.toFlipDelay[i].column;
      io.to(room).emit('serverFlip', toFlip, "/img/back.png", false, name);
    }

    await new Promise(r => setTimeout(r, 200));
    for (var i = 0; i < actions.toFlipDisappear.length; i++) {
      toFlip = "#R" + actions.toFlipDisappear[i].row + "C" + actions.toFlipDisappear[i].column;
      console.log(actions.toFlipDisappear[i].QosSound);
      io.to(room).emit('disappear', toFlip, actions.toFlipDisappear[i].heartSound, actions.toFlipDisappear[i].QosSound);
      io.to(room).emit('serverFlip', toFlip, "/img/back.png", false, name); //Also have to flip them back
    }

    if (game.isGameOver()) {
      var scoreUpdate = game.getScores();
      var qString = "?";
      var idxToPlace = ["first", "second", "third"];
      for (var i = 0; i < scoreUpdate.length; i++) {
        qString += idxToPlace[i] + "=" + scoreUpdate[i].player + "," + scoreUpdate[i].score + "&"
      }
      io.to(room).emit('gameOver', qString);
    }
  }

  function updateScore(socket, room) {
    var scoreUpdate = serverAdaptor.getGame(room).getScores();
    io.to(room).emit('scoreUpdate', scoreUpdate);
  }

  function removeStale(room){
    var alreadyUsed = serverAdaptor.getGame(room).getRemovedCards();
    for (var i = 0; i < alreadyUsed.length; i++){
      var toFlip = "#R" + alreadyUsed[i].row + "C" + alreadyUsed[i].column;
      io.to(room).emit('disappear', toFlip, false, false); //No Sound
    }
  }
});