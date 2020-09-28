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
        tile.setTrayName(this.name);
        this.needsRedraw = true;
        if (this.clickTo) {
            this.setTileOnclick(tile);
        }
    }
    
    addTiles(tiles) {
        for (let tile of tiles) {
            this.addTile(tile);
        }
    }
    
    setClickTo(newTrayName) {
        this.clickTo = newTrayName;
        if (newTrayName && newTrayName !== '') {
            const newTray = this.deal.getTray(newTrayName);
            for (let tile of this.getTiles()) {
                this.setTileOnclick(tile,newTray);
            }
        } else {
            for (let tile of this.getTiles()) {
                this.tile.onclick = null;
            }
        }
    }
    
    setTileOnclick(tile,toTray) {
        if (!toTray) {
            toTray = this.deal.getTray(this.clickTo);
        }
        
        const fromTray = this;
        tile.tileElt.onclick = function() {
            toTray.addTile(tile);
            fromTray.needsRedraw = true;
            toTray.needsRedraw = true;
            tileMoved(tile,fromTray,toTray);
            draw();
        }
    }
    
    clear() {
        // Do nothing by default.
    }
    
    moveAllTilesTo(trayName) {
        const newTray = currentDeal.getTray(trayName);
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

class PlayOrderTray extends Tray {
    tiles = [];
    
    getTiles() {
        return this.tiles;
    }
    
    addTile(tile) {
        super.addTile(tile);
        this.tiles.push(tile);
        tile.tileElt.style.zIndex = this.tiles.length + 1;
    }
    
    clear() {
        tiles = [];
    }
}

