var shortid = require('shortid');


class lobbyRoom{
    constructor(){
        this.lobbies = {};
        this.lobbyInitialized = {};
    }

    createLobby(){
        var lid = shortid.generate();
        this.lobbies[lid] = [];
        return lid;
    }

    addPlayerToLobby(playerName, lid){
        var lobby = lid;
        if (lobby == null){
            lobby = this.createLobby();
        }

        var admin = false;
        //First one is admin
        if (!(lobby in this.lobbyInitialized)){
            this.lobbies[lobby] = {};
            this.lobbyInitialized[lobby] = true;
            admin = true;
        }

        var pid = shortid.generate();
        var player = {
            name: playerName,
            pid: pid,
            admin: admin,
            lobby: lobby,
        }

        console.log(player);

        this.lobbies[lobby][pid] = player;
        return player.pid;
    }

    removePlayerFromLobby(player, lid){
        var lobby = lid;
        if (lobby == null){
            lobby = this.createLobby();
        }
        this.lobbies[lobby].push(player);
    }

    isPlayerAdmin(pid, room){
        if (!(room in this.lobbies)){
            return false;
        }

        if (!(pid in this.lobbies[room])){
            return false;
        }

        return this.lobbies[room][pid].admin;
    }

    createPlayer(){

    }

    getAllPlayers(lid){
        return this.lobbies[lid];
    }

    deleteLobby(lid){
        delete this.lobbies[lid];
    }

}

module.exports.lobbyRoom = lobbyRoom;