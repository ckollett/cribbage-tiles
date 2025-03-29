// This file is shared between the server and the browser.
// This block will add newTile to the exports on the server
// side but do nothing in the browser.
if (typeof module !== 'undefined') {
    module.exports = {
        newTile: function(suit, runValue) {
            return new Tile(suit, runValue);
        },
        
        resolveTile: function(tileID) {
            return Tile.fromID(tileID);
        },
        
        idsToTiles: idsToTiles,
        tilesToIds: tilesToIds
    };
}

class Tile {
    static suits = ['c', 'm', 's', 't'];
    
    constructor(suit, runValue) {
        this.suit = suit;
        this.runValue = runValue;
        if (suit !== '') {
            const suitIdx = Tile.suits.indexOf(suit);
            this.sortValue = runValue*4 + suitIdx;
        } else {
            this.sortValue = 100;
        }
    }
  
    getRunValue() {
        return this.runValue;
    }
  
    getCountValue() {
        return Math.min(this.runValue, 10);
    }
  
    getDisplayValue() {
        switch (this.runValue) {
            case 11 : return 'J';
            case 12 : return 'Q';
            case 13 : return 'K';
            default : return '' + this.runValue;
        }
    }
  
    getSuitID() {
        return this.suit;
    }
    
    getSuitName() {
        switch (this.suit) {
            case 'c' : return 'campfire';
            case 'm' : return 'mug';
            case 's' : return 'sleepingbag';
            case 't' : return 'tent';
        }
        return '';
    }
    
    getId() {
        return this.suit + this.getRunValue();
    }
    
    isEqual(tile) {
        return this.sortValue === tile.sortValue;
    }
    
    compareTo(tile) {
        return this.sortValue - tile.sortValue;
    }
    
    static fromID(id) {
        if (Array.isArray(id)) {
            return id.map(singleId => Tile.fromId(singleId));
        }
        
        if (id === '') {
            // Create a placeholder tile with no suit or value.
            return new Tile('', 0);
        }
        
        const suit = id.charAt(0);
        const runValue = parseInt(id.substring(1));
        return new Tile(suit, runValue);
    }
    
    static toID(tiles) {
        if (Array.isArray(tiles)) {
            return tiles.map(tile => tile.getId());
        } else {
            return tiles.getId();
        }
    }
}

function tilesToIds(tiles) {
    return tiles.map(tile => tile.getId());
}

function idsToTiles(ids) {
    return ids.map(id => Tile.fromID(id));
}
