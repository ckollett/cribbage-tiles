const tileWidth = 13;
const columnWidth = 14;

class Tray {
    
    constructor(deal, name, row, options) {
        this.deal = deal;
        this.name = name;
        this.row = row;
        this.trayXOffset = options.trayXOffset ? options.trayXOffset : 0;
        this.xOffset = options.xOffset ? options.xOffset : columnWidth;
        this.yOffset = options.yOffset ? options.yOffset : 0;
        this.rightSide = options.rightSide;
        this.clickTo = options.clickTo;
        this.flipped = options.flipped;
        this.needsRedraw = false;
    }
    
    getTiles() {
        return [];
    }
    
    addTile(tile) {
        tile.setTray(this);
        this.needsRedraw = true;
        if (this.clickTo) {
            this.setTileOnclick(tile);
        }
        this.onTileAdded(tile);
    }
    
    addTiles(tiles) {
        for (let tile of tiles) {
            this.addTile(tile);
        }
    }
    
    onTileAdded(tile) {
        // Do nothing by default.
    }
    
    onTileRemoved(tile) {
        // Do nothing by default.
    }
    
    setClickTo(newTrayName,validator) {
        this.clickTo = newTrayName;
        if (newTrayName && newTrayName !== '') {
            const newTray = this.deal[newTrayName];
            for (let tile of this.getTiles()) {
                this.setTileOnclick(tile,newTray,validator);
            }
        } else {
            for (let tile of this.getTiles()) {
                this.elt.onclick = null;
            }
        }
    }
    
    setTileOnclick(tile,toTray,validator) {
        if (!toTray) {
            toTray = this.deal[this.clickTo];
        }
        
        const fromTray = this;
        tile.elt.onclick = function() {
            if (!validator || validator(tile)) {
                toTray.addTile(tile);
                fromTray.needsRedraw = true;
                toTray.needsRedraw = true;
                draw();
            }
        }
    }
    
    clear() {
        // Do nothing by default.
    }
    
    moveAllTilesTo(trayName) {
        const newTray = currentDeal[trayName];
        const tiles = this.getTiles();
        this.clear();
        newTray.addTiles(tiles);
        draw();
    }
    
    getPosition(idx, tile) {
        var x = this.trayXOffset + (idx * this.xOffset);
        if (this.rightSide) {
            x = 100 - x - tileWidth;
        }
        
        var y = this.row * 33;
        if (tile.owner === 'player') {
            y -= this.yOffset;
        } else {
            y += this.yOffset;
        }
        
        return {
            "left":x.toString() + '%',
            "top":y.toString() + '%',
            "flip":this.flipped
        };
    }
    
    getLastTile() {
        const tiles = this.getTiles();
        return tiles[tiles.length-1];
    }
    
    getLastTiles(num) {
        const tiles = this.getTiles();
        return tiles.slice(tiles.length-2,tiles.length);
    }
    
}

class SortOrderTray extends Tray {
    
    getTiles() {
        const tiles = this.deal.getTilesInTray(this.name);
        if (this.rightSide) {
            tiles.reverse();
        }
        return tiles;
    }
}

class CribSelectionTray extends SortOrderTray {
    
    onTileAdded(tile) {
        this.checkNumSelected();
    }
    
    onTileRemoved(tile) {
        this.checkNumSelected();
    }
    
    checkNumSelected() {
        const button = document.getElementById('thebutton');
        const selected = this.getTiles();
        if (selected.length === 2) {
            button.classList.remove('hidden');
        } else {
            button.classList.add('hidden');
        }
    }
}

class PlayOrderTray extends Tray {
    tiles = [];
    
    getTiles() {
        return this.tiles;
    }
    
    addTile(tile) {
        this.tiles.push(tile);
        super.addTile(tile);
    }
    
    clear() {
        this.tiles = [];
    }
}

class PegTray extends PlayOrderTray {
    
    onTileAdded(tile) {
        checkForMessage();
        if (tile.owner === 'player') {
            sendTilePegged(tile.data);
        }
    }
}

