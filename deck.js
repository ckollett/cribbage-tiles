module.exports = {
    shuffle : function() {
        var deck = createDeck();
        shuffleDeck(deck);
        return deck;
    },
    
    // This is here just to make it easier to debug nobs issues.
    getJack : function() {
        return new card("mug", "J", 10);
    }
}

function createDeck() {
    var deck = [];
    var suits = ['mug','tent','campfire','sleepingbag'];
    for (let suit of suits) {
        for (var j = 1; j <= 13; j++) {
            deck.push(new card(suit, j));
        }
    }
    return deck;
}

function card(suit, rawNum) {
    this.suit = suit;
    this.rawNum = rawNum;
    switch (rawNum) {
        case 11 : this.num = "J"; break;
        case 12 : this.num = "Q"; break;
        case 13 : this.num = "K"; break;
        default : this.num = rawNum;
    }
    this.pegValue = Math.min(rawNum, 10);

    this.equals = function(otherCard) {
        return this.suit === otherCard.suit && this.num === otherCard.num;
    }

    return this;
}

function shuffleDeck(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}