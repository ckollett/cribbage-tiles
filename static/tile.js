class Tile {
    constructor(tile, owner) {
        this.tile = tile;
        this.tileElt = renderTile(tile);
        this.owner = owner;
        this.state = 'hand';
    }
    
    toggleSelection() {
        if (this.state === 'hand') {
            this.state = 'selected';
        } else if (this.state === 'selected') {
            this.state = 'hand';
        }
    }
    
    compareTo(otherTile) {
        const byNum = this.getSortValue() - otherTile.getSortValue();
        if (byNum === 0) {
            return this.getSuit().localeCompare(otherTile.getSuit());
        } else {
            return byNum;
        }
    }
        
    getSortValue() {
        var sortValue = 0;
        if (this.owner === 'opponent') {
            sortValue += 13;
        }
        
        const num = this.getNum();
        switch (num) {
            case 'J' : return sortValue + 11;
            case 'Q' : return sortValue + 12;
            case 'K' : return sortValue + 13;
            default : return sortValue + num;
        }
    }
    
    getPegValue() {
        const num = this.getNum();
        switch (num) {
            case 'J' : 
            case 'Q' : 
            case 'K' : return 10;
            default : return num;
        }
    }
    
    getNum() {
        return this.tileElt.num;
    }
    
    getSuit() {
        return this.tileElt.suit;
    }
    
}
