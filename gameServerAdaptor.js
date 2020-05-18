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
        this.expectedPlayers = {};
    }

    //Probably shouldn't use this - maybe for debug only...
    createRoom(){
        var room = shortid.generate();
        while (this.allRooms.includes(room)){
            room = shortid.generate();
        }
        this.allRooms.push(room);
        this.games[room] = new gameClass.offensiveHeart();

        return room;
    }

    setLobbyHandoverData(data, rid){
        this.expectedPlayers[rid] = data;
        return this.createNamedRoom(rid);
    }

    okayToJoin(rid, pid, name){
        if (!(rid in this.expectedPlayers)){
            return false;
        }

        if (!(pid in this.expectedPlayers[rid])){
            return false;
        }

        if(name != this.expectedPlayers[rid][pid].name){
            return false;
        }

        return true;
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


    joinRoom(rid, pid, pName, socket){
        //Sanity check - if direct room creation attempt
        if (!(rid in this.games)){ 
            this.createNamedRoom(rid);
        }
        socket.join(rid);
        this.games[rid].addPlayer(pid, pName);
        this.sockets[socket] = {
            room: rid,
            player: pName,
            pid: pid,
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
            return this.sockets[socket].pid;
        }
        return null;
    }

    leaveRoom(socket){
        //You can't really leave at this point...
        //Lobby already gave us an list, just keep the score...
        //console.log("Leaving so soon?")
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