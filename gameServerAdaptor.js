var deckClass = require('./deck');
var gameClass = require('./game');
var shortid = require('shortid');

class gameServerAdaptor{
    constructor(){
        //Room to Game mapper
        this.games = {}

        //socket to room mapper
        this.sockets = {}

        this.allRooms = [];
        this.toLeave = [];
    }

    createRoom(){
        var room = shortid.generate();
        while (this.allRooms.includes(room)){
            room = shortid.generate();
        }
        this.allRooms.push(room);
        this.games[room] = new gameClass.offensiveHeart();

        return room;
    }

    createNamedRoom(name){
        var room = name;
        while (this.allRooms.includes(room)){
            room = shortid.generate();
        }
        this.allRooms.push(room);
        this.games[room] = new gameClass.offensiveHeart();

        return room;
    }

    getOkayName(room, name){
        var okayName = name;
        var nameIdx = 0;
        if (room in this.games) {
            if (this.games[room] == null) {
                okayName = name;    //Okay to use
            } else {
                while (this.games[room].getPlayers().includes(okayName)){
                    nameIdx += 1;
                    okayName = okayName + nameIdx;
                }
            }
        }
        return okayName;
    }

    joinRoom(room, socket, player){
        //Sanity check - if direct room creation attempt
        if (!(room in this.games)){ 
            this.createNamedRoom(room);
        }

        socket.join(room);

        if (this.toLeave.includes(player)){
            this.toLeave = this.toLeave.filter(item => !(item == player));
        } else {
            player = this.games[room].addPlayer(player);
        }

        this.sockets[socket] = {
            room: room,
            player: player
        };
    }

    getRoom(socket){
        if (socket in this.sockets){
            return this.sockets[socket].room;
        }
        return null;
    }

    getPlayer(socket){
        if (socket in this.sockets){
            return this.sockets[socket].player;
        }

        return null;
    }

    leaveRoom(socket){
        var player = this.getPlayer(socket);
        if (player != null){
            this.toLeave.push(player);
            this.playerLeave(socket);
        }
    }

    async playerLeave(socket){
        await new Promise(r => setTimeout(r, 1000));
        var rid = this.getRoom(socket);
        var game = this.getGame(rid);
        var player = this.getPlayer(socket)

        if (this.toLeave.includes(player) && player != null && rid != null){
            game.removePlayer(player);
            if (game.countPlayers() == 0){
                delete this.games[rid];
            }        
        }
    }

    getGame(rid){
        //Create new game if not exists
        if (!(rid in this.games)) {
            this.games[rid] = new gameClass.offensiveHeart();
        }
        return this.games[rid];
    }

    getAllRooms(){
        return this.allRooms
    }

    isRoomValid(rid){
        return (rid.includes(rid))
    }

}


module.exports.gameServerAdaptor = gameServerAdaptor;