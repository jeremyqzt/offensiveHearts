const Suites = {
    Club: 0,
    Spade: 1,
    Heart: 2,
    Diamond: 3,
}

class deck{
    constructor(deck = 1){
        this.suits = [Suites.Club, Suites.Spade, Suites.Heart, Suites.Diamond];
        this.suitNames = ["clubs", "spades", "hearts", "diamonds"];

        this.values = [1,2,3,4,5,6,7,8,9,10,11,12,13];
        this.valueNames = ["ace",2,3,4,5,6,7,8,9,10,"jack","queen","king"];

        this.deck = [];
        for (var i = 0; i < this.suits.length; i++) {
            for (var j = 0; j < this.values.length; j++) {
                this.deck.push({
                    suit: this.suits[i],
                    value: this.values[j],
                    imageName: this.valueNames[j] + "_of_" + this.suitNames[i] + ".png",
                });
            }
        }
    }

    isEquivalent(cardA, cardB) {
        var aProps = Object.getOwnPropertyNames(cardA);
        var bProps = Object.getOwnPropertyNames(cardB);
    
        if (aProps.length != bProps.length) {
            return false;
        }
    
        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];
                if (cardA[propName] !== cardB[propName]) {
                return false;
            }
        }
        return true;
    }

    // 1 Card
    getSpecificCard(suit, val) {
        //value is 0 offset
        var ret = {
            suit: this.suits[suit],
            value: this.values[val - 1],
            imageName: this.valueNames[val - 1] + "_of_" + this.suitNames[suit] + ".png",
        };

        this.deck = this.deck.filter(item => !this.isEquivalent(item, ret));

        return ret;

    }
    
    getAllRemainingCards(){
        return this.deck;
    }

    //All 13 cards from a suit
    getSpecificSuit(suit) {
        var ret = [];
        var toPush = null;

        for (var i = 0; i < this.values.length; i++){
            toPush = {
                suit: this.suits[suit],
                value: this.values[i],
                imageName: this.valueNames[i] + "_of_" + this.suitNames[suit] + ".png",
            };

            this.deck = this.deck.filter(item => !this.isEquivalent(item, toPush));
            ret.push(toPush);
        }
        return ret;
    }

    duplicateCards(cards) {
        var cardCpy = cards.map((x) => x);
        return cardCpy.concat(cards);
    }

    isSameCard(cardA, cardB){
        return ((cardA.suit === cardB.suit) && (cardA.value === cardB.value));
    }

    isHeart(card){
        return card.suit == Suites.Heart;
    }

    isQoS(card){
        return (card.suit == Suites.Spade && card.value == 12)
    }

    shuffleCurDeck() {
        this.deck = this.shuffle(this.deck);
    }

    shuffle(cardArr) {
        var j, x, i;
        for (i = cardArr.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = cardArr[i];
            cardArr[i] = cardArr[j];
            cardArr[j] = x;
        }
        return cardArr;
    }
    
    dealXCards(x){
        var ret = [];
        for (var i = 0; i < x; i++){
            ret.push(this.deck[i]);
        }
        this.deck.splice(0, x);

        return ret;
    }

    *generateDeal(){
        for (var i = 0; i< this.deck.length; i++){
            yield this.deck[i]
        }
    }
    
}
module.exports.suites = Suites;
module.exports.deck = deck;
