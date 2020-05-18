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
        var player;

        for (player in this.lobbies[lid]){
            ret.push(this.lobbies[lib[player]]);
        }
        return ret;
    }

    removePlayerFromLobby(rid, pid){
        if (!(rid in this.lobbies)){
            return false;
        }

        if (!(pid in this.lobbies[rid])){
            return false;
        }

        delete this.lobbies[rid][pid];
        return true;
    }

    getPidByName(rid, name){
        if (!(rid in this.lobbies)){
            return "";
        }
        var player;
        for (player in this.lobbies[rid]){
            if (this.lobbies[rid][player].name == name){
                return this.lobbies[rid][player].pid;
            }
        }

        return "";
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
    
    getPlayerFromPid(rid, pid){
        if (!(rid in this.lobbies)){
            return "";
        }

        if (!(pid in this.lobbies[rid])){
            return "";
        }

        return this.lobbies[rid][pid].name;
    }

    getAllPlayers(lid){
        return this.lobbies[lid];
    }

    deleteLobby(lid){
        delete this.lobbies[lid];
    }

}

module.exports.lobbyRoom = lobbyRoom;