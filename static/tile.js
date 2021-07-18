class Tile {
    constructor(data, owner) {
        this.data = data;
        this.elt = renderTile(data);
        this.elt.tile = this;
        this.owner = owner;
    }
    
    setTray(tray) {
        if (tray && this.tray && this.tray !== tray) {
            this.tray.onTileRemoved(this);
        }
        this.tray = tray;
    }
    
    getTray() {
        return this.tray;
    }
    
    getTrayName() {
        return this.tray ? this.tray.name : '';
    }
    
    update(data) {
        this.data = data;
            
        const front = this.elt.getElementsByClassName("tilefront").item(0);
        front.classList.add(data.suit);
    
        const value = front.getElementsByClassName("value").item(0);
        value.innerHTML = data.num;
    }
    
    compareTo(otherTile, ignoreOwner) {
        const byNum = this.getSortValue(ignoreOwner) - otherTile.getSortValue(ignoreOwner);
        if (byNum === 0) {
            return this.getSuit().localeCompare(otherTile.getSuit());
        } else {
            return byNum;
        }
    }
        
    getSortValue(ignoreOwner) {
        var sortValue = 0;
        if (!ignoreOwner && this.owner === 'opponent') {
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
        return this.data.num;
    }
    
    getSuit() {
        return this.data.suit;
    }
    
}
