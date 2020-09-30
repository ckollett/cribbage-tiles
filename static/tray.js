const tileWidth = 13;
const columnWidth = 14;

class Tray {
    
    constructor(deal, name, row, options) {
        this.deal = deal;
        this.name = name;
        this.row = row;
        
        // Some default values.
        this.trayXOffset = 0;
        this.xOffset = columnWidth;
        this.yOffset = 0;
        
        this.needsRedraw = false;
        Object.assign(this,options);
    }
    
    getTiles() {
        return [];
    }
    
    addTile(tile) {
        if (this.validate && !this.validate(tile)) {
            return false;
        }
        
        const oldTray = tile.getTray();
        tile.setTray(this);
        this.needsRedraw = true;
        this.onTileAdded(tile);
        if (oldTray) {
            oldTray.onTileRemoved(tile);
        }
        return true;
    }
    
    addTiles(tiles) {
        for (let tile of tiles) {
            if (!this.addTile(tile)) {
                return false;
            }
        }
        return true;
    }
    
    onTileAdded(tile) {
        // Do nothing by default.
    }
    
    onTileRemoved(tile) {
        this.needsRedraw = true;
    }
    
    setClickTo(newTrayName) {
        this.clickTo = newTrayName;
    }
    
    clear() {
        // Do nothing by default.
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
            "flip":this.flipped,
            'zIndex':this.getZIndex(idx)
        };
    }
    
    getZIndex(idx) {
        return this.zIndex ? this.zIndex : 1;
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
        super.onTileRemoved(tile);
        this.checkNumSelected();
    }
    
    checkNumSelected() {
        const button = document.getElementById('thebutton');
        const selected = this.getTiles();
        // TODO: Move this if/else block?
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
    
    onTileAdded(tile) {
        this.tiles.push(tile);
    }
    
    clear() {
        this.tiles = [];
    }
}

class CribTray extends PlayOrderTray {
    getZIndex(idx) {
        return idx + 2;
    }
}

class PegTray extends PlayOrderTray {
    validate(tile) {
        var total = tile.getPegValue();
        for (let tile of this.getTiles()) {
            total += tile.getPegValue();
        }
        return total <= 31;
    }
    
    onTileAdded(tile) {
        super.onTileAdded(tile);
        checkForMessage();
        if (tile.owner === 'player') {
            sendTilePegged(tile.data);
        }
    }
    
    getZIndex(idx) {
        return idx + 2;
    }
}

