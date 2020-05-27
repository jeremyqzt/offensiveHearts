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
        this.round = 0 + 1; //Already in first round
        this.totalRounds = 1;
        this.demo = 0;
        this.demoed = {};
        this.flipId = 0;
        this.pidToNames = {};
    }

    //False indicates no more rounds
    newRound() {
        if (this.round < this.totalRounds) {
            this.makeNewGameDeck();
            this.round++;
            return true;
        }
        return false;
    }

    makeNewGameDeck() {
        var totalRequiredCards = 24;
        var otherCards = [];

        var allHearts = this.deck.getSpecificSuit(deckClass.suites.Heart); //13 Cards
        var queenOfSpades = this.deck.getSpecificCard(
            deckClass.suites.Spade,
            12
        ); //14 Cards
        this.deck.shuffleCurDeck();
        otherCards = this.deck.dealXCards(totalRequiredCards - 14);

        this.gameDeck = allHearts.concat(queenOfSpades);
        this.gameDeck = this.gameDeck.concat(otherCards);
        this.gameDeck = this.deck.duplicateCards(this.gameDeck);
        this.gameDeck = this.deck.shuffle(this.gameDeck);
        this.totalMatchesLeft = totalRequiredCards;
        this.removePos = [];
    }

    flipCardSanityCheck(row, col, pid) {
        if (!this.players.includes(pid)) {
            return false;
        }

        for (var key in this.playerCards) {
            for (var j = 0; j < this.playerCards[key].length; j++) {
                if (
                    this.playerCards[key][j].row == row &&
                    this.playerCards[key][j].column == col
                ) {
                    return false;
                }
            }
        }
        return true;
    }

    flipCardDemo(row, col) {
        return this.gameDeck[this.getCardIdx(row, col)];
    }

    startDemo(pid) {
        this.demo += 1;
        this.demoed[pid] = true;
    }

    endDemo() {
        this.demo -= 1;
    }

    demoedAlready(pid) {
        if (pid in this.demoed) {
            return true;
        }
        return false;
    }

    needToPlaySoundHeart(card) {
        if (card.suit == deckClass.suites.Heart) {
            return true;
        }
        return false;
    }

    resetPlayerCards(pid) {
        this.playerCards[pid] = [];
    }

    getPlayersCards(pid) {
        return this.playerCards[pid];
    }

    compareAction(ActA, ActB) {
        return ActA.id === ActB.id;
    }

    isCardInHand(row, col) {
        for (var player in this.playerCards) {
            for (var t = 0; t < this.playerCards[player].length; t++) {
                if (this.playerCards[player][t].row == row && this.playerCards[player][t].column == col) {
                    return true;
                }
            }
        }

        return false;
    }

    flipCard(row, col, pid) {
        if (!this.flipCardSanityCheck(row, col, pid) || (this.demo != 0)) {
            return {
                toFlip: null,
                toFlipDelay: [],
                toFlipDisappear: [],
            };
        }

        var toFlip = null;
        var flipBackWDelay = [];
        var matched = [];
        //Read index of card
        var idx = this.getCardIdx(row, col);
        this.flipId += 1;


        if (this.playerCards[pid].length == 0) { //First Flip
            this.playerCards[pid].push({
                card: this.gameDeck[idx],
                row: row,
                column: col,
                id: this.flipId,
            });
            toFlip = {
                card: this.gameDeck[idx],
                id: this.flipId,
            };
        } else { //Second Flip
            if (
                this.deck.isSameCard(
                    this.playerCards[pid][0].card,
                    this.gameDeck[idx]
                )
            ) {
                //Matched, inc score
                //Flip card
                //Flip it back after 1 second
                //Decrease total card pool
                var heartSound = (this.deck.isHeart(this.gameDeck[idx])) ? true : false;
                var QoSSound = (this.deck.isQoS(this.gameDeck[idx])) ? true : false;

                this.updateScores(pid, this.gameDeck[idx]);
                toFlip = {
                    card: this.gameDeck[idx],
                    id: this.flipId,
                };
                matched = [
                    { row: row, column: col, heartSound: heartSound, QosSound: QoSSound, },  //Just play once
                    {
                        row: this.playerCards[pid][0].row,
                        column: this.playerCards[pid][0].column,
                        heartSound: false,
                        QosSound: false,
                    },
                ];
                this.removePos = this.removePos.concat(matched);
                this.totalMatchesLeft--;
            } else { //Missed
                toFlip = {
                    card: this.gameDeck[idx],
                    id: this.flipId,
                };
                flipBackWDelay = [
                    { row: row, column: col },
                    {
                        row: this.playerCards[pid][0].row,
                        column: this.playerCards[pid][0].column,
                    },
                ];
            }
            this.playerCards[pid] = [];
        }

        return {
            toFlip: toFlip,
            toFlipDelay: flipBackWDelay,
            toFlipDisappear: matched,
        };
    }

    getRemovedCards() {
        return this.removePos;
    }

    isGameOver() {
        return this.totalMatchesLeft == 0;
    }

    updateScores(pid, matchedCard) {
        if (matchedCard.suit == deckClass.suites.Heart) {
            this.updateEveryoneElse(pid, -1);
        } else if (
            matchedCard.suit == deckClass.suites.Spade &&
            matchedCard.value == 12
        ) {
            this.scores[pid] += 2;
            this.updateEveryoneElse(pid, -5);
        } else {
            this.scores[pid] += 2;
        }
    }

    updateEveryoneElse(pidIgnore, score) {
        for (var key in this.scores) {
            if (key != pidIgnore) {
                this.scores[key] += score;
            }
        }
    }

    getScores() {
        var retArr = [];
        for (var key in this.scores) {
            retArr.push({
                pid: key,
                player: this.getPlayerRegularName(key),
                score: this.scores[key],
            });
        }
        return retArr.sort((a, b) => b.score - a.score);
    }

    getCardIdx(row, col) {
        return (row - 1) * 12 + (col - 1);
    }

    getCard(row, col) {
        var idx = this.getCardIdx(row, col);
        return this.gameDeck[idx];
    }

    addPlayer(pid, regularName) {
        this.pidToNames[pid] = regularName;
        this.playerCards[pid] = [];
        if (!(this.players.includes(pid))) {
            this.players.push(pid);
            this.scores[pid] = 0;
        }
    }

    removePlayer(pid) {
        this.players = this.players.filter((item) => item != pid);
        delete this.scores[pid];
    }

    countPlayers() {
        return this.players.length;
    }

    getPlayers() {
        return this.players;
    }

    getPlayerRegularName(pid) {
        return this.pidToNames[pid];
    }
}

module.exports.offensiveHeart = offensiveHeart;
