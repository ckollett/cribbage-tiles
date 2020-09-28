class Tile {
    constructor(tile, owner) {
        this.tile = tile;
        this.tileElt = renderTile(tile);
        this.owner = owner;
        this.trayName = '';
    }
    
    setTrayName(name) {
        this.trayName = name;
    }
    
    getTrayName() {
        return this.trayName;
    }
    
    update(tile) {
        this.tile = tile;
            
        const front = this.tileElt.getElementsByClassName("tilefront").item(0);
        front.classList.add(tile.suit);
    
        const value = front.getElementsByClassName("value").item(0);
        value.innerHTML = tile.num;
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
        return this.tile.num;
    }
    
    getSuit() {
        return this.tile.suit;
    }
    
}
