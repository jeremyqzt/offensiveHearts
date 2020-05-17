var shortid = require('shortid');


class lobbyRoom{
    constructor(){
        this.lobbies = {};
        this.lobbyInitialized = {};
        this.socketPlayers = {};
    }

    createLobby(){
        var lid = shortid.generate();
        this.lobbies[lid] = {};
        return lid;
    }

    isPidValid(pid, rid){
        var ret = false;
        //console.log(this.lobbies);
        if (!rid in this.lobbies || this.lobbies[rid] == undefined){
            return ret;
        }
        if(pid in this.lobbies[rid]){
            ret = true;
        }
        return ret;
    }

    getValidName(name, rid){
        var valid = false;
        var id = 0;
        var validName = name;
        var pid;
        while (!valid){
            valid = true;
            for (pid in this.lobbies[rid]){
                if (this.lobbies[rid][pid].name == validName){
                    valid = false;
                    validName = `${validName}${id}`;
                    break;
                }
            }
            id += 1;
        }
        return validName;
    }

    createLobbyIfNotExist(rid){
        if (!rid in this.lobbies){
            return this.createLobby();
        }
        return rid;
    }

    joinLobby(socket, pid, lid){
        socket.join(lid);
        this.socketPlayers[socket] = pid;
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

        this.lobbies[lobby][pid] = player;
        return player.pid;
    }

    getAllPlayers(lid){
        var ret = [];
        for (player in this.lobbies[lid]){
            ret.push(this.lobbies[lib[player]]);
        }
        return ret;
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