var deck = require("./deck");

module.exports = {
    
    deal : function() {
        this.cards = deck.shuffle();
        this.crib = [];
        this.numPegged = 0;
        
        this.getHand = function() {
            return this.cards.splice(0,6);
        }
        
        this.addToCrib = function(cards) {
            this.crib.push(cards);
        }    
        
        this.getTurn = function() {
            return this.cards.pop();
        }
        
        return this;
    }
}