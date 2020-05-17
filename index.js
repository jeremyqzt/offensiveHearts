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
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("start");
});

app.get('/lobby/:rid/pid/:pid/name/:name', function (req, res) {
  var rid = req.params.rid;
  var pid = req.params.pid;
  var name = req.params.name;
  var admin = lobbies.isPlayerAdmin(pid, rid);
  var roomCtx = {
    rid: rid,
    pid: pid,
    name: name,
    admin: admin,
  };
  res.render("lobby", {roomCtx: roomCtx});
})

app.get('/room/:rid/player/:pid/', function (req, res) {
  okayName = serverAdaptor.getOkayName(req.params.rid, req.params.pid);
  if (okayName == req.params.pid) {
      var roomInfo = {roomName: req.params.rid,  player: req.params.pid};
      res.render("game", {info: roomInfo});
  } else {
    res.redirect(`/room/${req.params.rid}/player/${okayName}`); //Avoid name collision
  }
})

app.post("/createRoom",function(req, res){
  var name = req.body.name;
  var room = req.body.roomId;
  if (room == ""){
    room = lobbies.createLobby();
  } else {
    room = lobbies.createLobbyIfNotExist(room);
  }

  var validName = lobbies.getValidName(name, room);
  var pid = lobbies.addPlayerToLobby(validName, room);
  res.redirect(`/lobby/${room}/pid/${pid}/name/${validName}`)
});

app.get('/gameOver',function(req, res){
  res.sendFile(__dirname + '/public/winner.html');
});

app.get('/credits',function(req, res){
  res.sendFile(__dirname + '/public/authors.html');
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});

app.all('*', function(req, res) {
  res.redirect(req.baseUrl);
});

var sockRooms = {};

io.on('connection', (socket) => {

    socket.on('disconnect', () => {
      var room = serverAdaptor.getRoom(socket);
      var player = serverAdaptor.getPlayer(socket);
      try{
        io.to(room).emit('chat', `${player} has left the room!`);
        serverAdaptor.leaveRoom(socket);
      } catch(e) {
        //console.log(e);
      }
    });

    socket.on('lobbyJoin', (rid, pid) => {
      var valid = lobbies.isPidValid(pid, rid);
      if (valid){
        lobbies.joinLobby(socket, pid, rid);
      } else {
        io.to(socket.id).emit("goHome");
      }
      var allPlayers = lobbies.getAllPlayers(rid);
      io.to(rid).emit('playerEnumeration', allPlayers);
    });

    socket.on('join', (room, player) => {
      console.log( `${player} has joined the ${room}!`)
      serverAdaptor.joinRoom(room, socket, player);
      io.to(room).emit('chat', player + " has joined the room!");
      updateScore(socket, room);
    });

    socket.on('flipReq', (row, col, name) => {
      var room = serverAdaptor.getRoom(socket);
      let toFlip = `#R${row}C${col}`;
      var actions = serverAdaptor.getGame(room).flipCard(row, col, name);

      if (actions.toFlip != null){
        io.to(room).emit('serverFlip', toFlip, "/img/" + actions.toFlip.imageName, true, name);
        postFlipActions(actions, socket, name, room);
      }
    });

    socket.on('chat', (player, msg) => {
      var room = serverAdaptor.getRoom(socket);
      io.to(room).emit('chat', player + ": " + msg);
    });

    async function postFlipActions(actions, sock, name, room){
      //return;
      var game = serverAdaptor.getGame(room);
      if (actions.toFlipDisappear.length > 0){
        updateScore(sock, room);
      }
  
      await new Promise(r => setTimeout(r, 500));
      var toFlip = "";
      for (var i = 0; i< actions.toFlipDelay.length; i++){
        toFlip = "#R" + actions.toFlipDelay[i].row + "C" + actions.toFlipDelay[i].column;
        io.to(room).emit('serverFlip', toFlip, "/img/back.png", false, name);
      }


      await new Promise(r => setTimeout(r, 200));
      for (var i = 0; i< actions.toFlipDisappear.length; i++){
        toFlip = "#R" + actions.toFlipDisappear[i].row + "C" + actions.toFlipDisappear[i].column;
        io.to(room).emit('disappear', toFlip);
        io.to(room).emit('serverFlip', toFlip, "/img/back.png", false, name); //Also have to flip them back
      }
  
      if (game.isGameOver()){
        var scoreUpdate = game.getScores();
        var qString="?";
        var idxToPlace =["first", "second", "third"];
        for (var i = 0; i< scoreUpdate.length; i++){
          qString += idxToPlace[i] + "=" + scoreUpdate[i].player + "," + scoreUpdate[i].score + "&"
        }
        io.to(room).emit('gameOver', qString);
      }
    }

    function updateScore(socket, room){
      var scoreUpdate = serverAdaptor.getGame(room).getScores();
      io.to(room).emit('scoreUpdate', scoreUpdate);
    }
});