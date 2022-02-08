module.exports = {
    
    game: function() {
        console.log('Creating new game');
        
        this.players = [];
        
        this.addPlayer = function(playerInfo, id) {
            console.log('Existing game. Adding ' + playerInfo.name);
            if (this.players.length < 2) {
                var newPlayer = new player(playerInfo, id);
                this.players.push(newPlayer);
                return true;
            }
            return false;
        }
        
        this.removePlayer = function(name) {
            for (var i = 0; i < this.players.length; i++) {
                var player = this.players[i];
                if (player.name === name) {
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

function player(playerInfo, id) {
    this.name = playerInfo.name;
    this.firstDeal = playerInfo.firstDeal;
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

    this.removeCard = function(card) {
        for (var i = 0; i < this.cards.length; i++) {
            if (this.cards[i].equals(card)) {
                this.cards.splice(i,1);
                return;
            }
        }
    }

    this.isGo = function(remaining) {
        for (let card of this.cards) {
            if (card.pegValue <= remaining) {
                return false;
            }
        }
        return true;
    }
}