var deckClass = require('./deck');


class offensiveHeart {
    constructor() {
        //We need 48 cards, get 24 then duplicate
        this.deck = new deckClass.deck();
        this.gameDeck = [];
        this.removePos = [];
        this.makeNewGameDeck();
        this.players = [];
        this.playerCards = {};
        this.scores = {};
        this.round = 0 + 1;//Already in first round
        this.totalRounds = 1;
    }

    //False indicates no more rounds
    newRound(){
        if (this.round < this.totalRounds){
            this.makeNewGameDeck();
            this.round++;
            return true;
        }
        return false;
    }

    makeNewGameDeck(){ 
        var totalRequiredCards = 24;
        var otherCards = [];

        var allHearts = this.deck.getSpecificSuit(deckClass.suites.Heart);  //13 Cards
        var queenOfSpades = this.deck.getSpecificCard(deckClass.suites.Spade, 12); //14 Cards
        this.deck.shuffleCurDeck();
        otherCards = this.deck.dealXCards(totalRequiredCards - 14)

        this.gameDeck = allHearts.concat(queenOfSpades);
        this.gameDeck = this.gameDeck.concat(otherCards);
        this.gameDeck = this.deck.duplicateCards(this.gameDeck);
        this.gameDeck = this.deck.shuffle(this.gameDeck);
        this.totalMatchesLeft = totalRequiredCards;
        this.removePos = [];
    }

    flipCardSanityCheck(row, col, player) {
        if (!this.players.includes(player)){
            return false;
        }

        for (var key in this.playerCards){
            for (var j = 0; j < this.playerCards[key].length; j++){
                if (this.playerCards[key][j].row == row && this.playerCards[key][j].column == col) {
                    return false;
                }
            }
        }
        return true;
    }

    flipCard(row, col, player){
        if (!this.flipCardSanityCheck(row, col, player)){
            return {
                toFlip: null,
                toFlipDelay: [],
                toFlipDisappear: []
            };       
        }

        var toFlip = null;
        var flipBackWDelay = [];
        var matched = [];
        //Read index of card
        var idx = this.getCardIdx(row, col);

        if (this.playerCards[player].length == 0){
            this.playerCards[player].push({
                    card: this.gameDeck[idx],
                    row: row,
                    column: col
                });
            toFlip = this.gameDeck[idx];
        } else {
            if (this.deck.isSameCard(this.playerCards[player][0].card, this.gameDeck[idx])){
                //Matched, inc score
                //Flip card
                //Flip it back after 1 second
                //Decrease total card pool
                this.updateScores(player, this.gameDeck[idx])
                toFlip = this.gameDeck[idx];
                matched = [
                    {row: row, column: col},
                    {row: this.playerCards[player][0].row, column: this.playerCards[player][0].column},
                ];
                this.removePos = this.removePos.concat(matched);
                this.totalMatchesLeft--;
            } else {
                toFlip = this.gameDeck[idx];
                flipBackWDelay = [
                    {row: row, column: col},
                    {row: this.playerCards[player][0].row, column: this.playerCards[player][0].column},
                ];            
            }
            this.playerCards[player] = [];
        }

        return {
            toFlip: toFlip,
            toFlipDelay: flipBackWDelay,
            toFlipDisappear: matched
        };
    }

    getRemovedCards(){
        return this.removePos;
    }

    isGameOver(){
        return (this.totalMatchesLeft == 0)
    }

    updateScores(player, matchedCard){
        if (matchedCard.suit == deckClass.suites.Heart){
            this.updateEveryoneElse(player, -1);
        } else if (matchedCard.suit == deckClass.suites.Spade && matchedCard.value == 12){
            this.scores[player]+=2;
            this.updateEveryoneElse(player, -13);
        } else {
            this.scores[player]+=2;
        }
    }

    updateEveryoneElse(playerToIgnore, score){
        for (var key in this.scores){
            if (key!=playerToIgnore){
                this.scores[key]+=score;
            }
        }
    }

    getScores(){
        var retArr = [];
        for (var key in this.scores){
            retArr.push({
                player: key,
                score: this.scores[key]
            });
        }
        return retArr.sort((a, b) => (b.score) - (a.score));
    }

    getCardIdx(row, col) {
        return ((row-1) * 12) + (col -1);
    }

    getCard(row, col) {
        var idx = this.getCardIdx(row, col);
        return this.gameDeck[idx];
    }

    addPlayer(name){
        console.log("Adding " + name);
        this.players.push(name);
        this.playerCards[name] = [];
        this.scores[name] = 0;
    }

    removePlayer(name){
        this.players = this.players.filter(item => item != name);
        delete this.scores[name];
    }

    countPlayers(){
        return this.players.length;
    }

    getPlayers(){
        return this.players;
    }
}

module.exports.offensiveHeart = offensiveHeart;
