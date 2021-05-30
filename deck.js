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
    for (var i = 0; i < suits.length; i++) {
        var suit = suits[i];
        for (var j = 1; j < 10; j++) {
            deck.push(new card(suit, j, j));
        }
        deck.push(new card(suit, "J", 10));
        deck.push(new card(suit, "Q", 10));
        deck.push(new card(suit, "K", 10));
    }
    return deck;
}

function card(suit, num, pegValue) {
    this.suit = suit;
    this.num = num;
    this.pegValue = pegValue;

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