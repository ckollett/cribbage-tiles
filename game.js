module.exports = {
    
    game: function() {
        this.players = [];
        
        this.addPlayer = function(name, id) {
            if (this.players.length < 2) {
                var newPlayer = new player(name, id);
                this.players.push(newPlayer);
                return true;
            }
            return false;
        }
        
        this.removePlayer = function(id) {
            for (var i = 0; i < this.players.length; i++) {
                var player = this.players[i];
                if (player.id === id) {
                    this.players.splice(i,1);
                    return true;
                }
            }
            return false;
        }
        
        this.isActive = function() {
            return this.players.length === 2;
        }
    }    
};

function player(name, id) {
    this.name = name;
    this.id = id;
    this.score = 0;
    this.hand = null;
    
    this.scorePoints = function(points) {
       this.score += points;
    }

    this.dealTo = function(cards) {
        this.hand = new hand(cards);
    }
}

function hand(cards) {
    this.cards = cards;
    var output = "";
    for (let card of cards) {
        output += card.pegValue + " ";
    }
    console.log(output);

    this.removeCard = function(card) {
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].equals(card)) {
                this.cards.splice(i,1);
                return;
            }
        }
    }

    this.isGo = function(remaining) {
        var output = "";
        for (let card of cards) {
            output += card.pegValue + " ";
        }
        console.log(output);
        
        for (let card of this.cards) {
            if (card.pegValue <= remaining) {
                return false;
            }
        }
        return true;
    }
}