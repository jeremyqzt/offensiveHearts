var express = require('express');
var bodyParser = require("body-parser");
var shortid = require('shortid');
var session = require('express-session');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var deckClass = require('./deck');
var gameClass = require('./game');

var roomToGame = {};

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({secret: 'secret', resave: true, saveUninitialized: true}));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/start.html');
});

app.post('/createRoom',function(req, res){
  var room = req.body.roomId;
  var name = req.body.name;
  if (room.length == 0) {
    room = shortid.generate();
    roomToGame[room] = new gameClass.offensiveHeart();
  }
  var roomInfo = {roomName: room,  player: name};
  res.render("lobby", {info: roomInfo});
});


app.get('/gameOver',function(req, res){
  res.sendFile(__dirname + '/public/winner.html');
});


http.listen(3000, () => {
  console.log('listening on *:3000');
});

var sockRooms = {};

io.on('connection', (socket) => {

    socket.on('disconnect', () => {
      try{
        io.to(sockRooms[socket].room).emit('chat', sockRooms[socket].player + " has left the room!");
        roomToGame[sockRooms[socket].room].removePlayer(sockRooms[socket].player);
        delete sockRooms[socket];
        if (roomToGame[sockRooms[socket].room].countPlayers() === 0) {
          delete roomToGame[roomToGame[sockRooms[socket].room]]; //Destroy the game if no one left
        }
      } catch(e) {
        console.log("Something bad happened trying to delete");
        console.log(e);
      }
    });

    socket.on('join', (room, player) => {
      socket.join(room);
      sockRooms[socket] = {room: room, player: player};
      roomToGame[sockRooms[socket].room].addPlayer(player);
      io.to(room).emit('chat', player + " has joined the room!");
      updateScore(socket);
      var alreadyUsed = roomToGame[sockRooms[socket].room].getRemovedCards();
      for (var i = 0; i < alreadyUsed.length; i++){
        var toFlip = "#R" + alreadyUsed[i].row + "C" + alreadyUsed[i].column;
        //console.log(alreadyUsed[i]);
        io.to(sockRooms[socket].room).emit('disappear', toFlip);
      }
    });

    socket.on('flipReq', (row, col, name) => {
      let toFlip = `#R${row}C${col}`;
      var idx = ((row-1) * 12) + (col -1);
      var actions = roomToGame[sockRooms[socket].room].flipCard(row, col, name);
      //var cardImg = roomToGame[sockRooms[socket].room].getCard(row, col).imageName;
      if (actions.toFlip != null){
        io.to(sockRooms[socket].room).emit('serverFlip', toFlip, "img/" + actions.toFlip.imageName, true, name);
        postFlipActions(actions, socket, name);
      }
    });

    socket.on('chat', (player, msg) => {
      io.to(sockRooms[socket].room).emit('chat', player + ": " + msg);
    });

    async function postFlipActions(actions, sock, name){
      //return;
      if (actions.toFlipDisappear.length > 0){
        updateScore(sock);
      }
  
      await new Promise(r => setTimeout(r, 500));
      var toFlip = "";
      for (var i = 0; i< actions.toFlipDelay.length; i++){
        toFlip = "#R" + actions.toFlipDelay[i].row + "C" + actions.toFlipDelay[i].column;
        io.to(sockRooms[socket].room).emit('serverFlip', toFlip, "img/back.png", false, name);
      }


      await new Promise(r => setTimeout(r, 200));
      for (var i = 0; i< actions.toFlipDisappear.length; i++){
        toFlip = "#R" + actions.toFlipDisappear[i].row + "C" + actions.toFlipDisappear[i].column;
        io.to(sockRooms[sock].room).emit('disappear', toFlip);
        io.to(sockRooms[socket].room).emit('serverFlip', toFlip, "img/back.png", false, name); //Also have to flip them back
      }
  
      if (roomToGame[sockRooms[socket].room].isGameOver()){
        var scoreUpdate = roomToGame[sockRooms[socket].room].getScores();
        var qString="?";
        var idxToPlace =["first", "second", "third"];
        for (var i = 0; i< scoreUpdate.length; i++){
          qString += idxToPlace[i] + "=" + scoreUpdate[i].player + "," + scoreUpdate[i].score + "&"
        }
        io.to(sockRooms[sock].room).emit('gameOver', qString);
      }
    }

    function updateScore(socket){
      var scoreUpdate = roomToGame[sockRooms[socket].room].getScores();
      io.to(sockRooms[socket].room).emit('scoreUpdate', scoreUpdate);
    }
});