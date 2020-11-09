const columnWidth = 14.4;
const tileWidth = 13.6;

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
    
    getTilesToDraw() {
        return this.getTiles();
    }
    
    addTile(tile) {
        if (this.validate && !this.validate(tile)) {
            return false;
        }
        
        const oldTray = tile.getTray();
        if (oldTray === this) {
            return true;
        }
        
        tile.setTray(this);
        this.needsRedraw = true;
        this.onTileAdded(tile);
        if (oldTray) {
            oldTray.onTileRemoved(tile);
        }
        return true;
    }
    
    shouldRedraw() {
        return this.needsRedraw && this.getTiles().length > 0;
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
    
    getPosition(tile) {
        let idx = this.getTiles().indexOf(tile);
        if (idx < 0) {
            return;
        }
        
        var x = this.trayXOffset + (idx * this.xOffset);
        if (this.rightSide) {
            x = 100 - x - tileWidth;
        }
        
        var y = this.row * 35;
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
        const arrow = document.getElementById('cribarrow');
        const selected = this.getTiles();
        // TODO: Move this if/else block?
        if (selected.length === 2) {
            arrow.classList.remove('hidden');
        } else {
            arrow.classList.add('hidden');
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
    
    onTileRemoved(tile) {
        const removeIdx = this.tiles.indexOf(tile);
        this.tiles.splice(removeIdx,1);
    }  
}

class CribTray extends PlayOrderTray {
    getZIndex(idx) {
        return idx + 2;
    }
    
    getTilesToDraw() {
        // Only ever need to draw two tiles at a time.
        // This prevents a delay when the second pair 
        // of tiles is sent to the crib; no need to redraw
        // the first pair.
        const tiles = super.getTilesToDraw();
        if (tiles.length > 2) {
            return tiles.slice(2,4);
        } else {
            return tiles;
        }
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
        if (!currentDeal.dealer) {
            currentDeal.dealerChanged(tile.owner);
        }
        
    }
    
    getZIndex(idx) {
        return idx + 2;
    }
}

