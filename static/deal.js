class Deal {
    constructor(tiles) {
        this.tiles = tiles;
        this.sort();
    }
    
    addTile(tile) {
        this.tiles.push(tile);
        this.sort();
    }
    
    sort() {
        this.tiles.sort((t1,t2) => t1.compareTo(t2));
    }
    
    getNumSelected() {
        return this.getTiles('player','selected').length;
    }
    
    moveSelectedToCrib() {
        const selected = this.getTiles('player','selected');
        for (let tile of selected) {
            tile.state = 'crib';
        }
        return selected;
    }
    
    getPeggedTiles() {
        return this.getTilesByState('pegged');
    }
    
    getNumPegged() {
        return this.getPeggedTiles().length;
    }
    
    getTiles(owner, state) {
        return this.tiles.filter(tile => tile.owner === owner && tile.state === state);
    }
    
    getTilesByOwner(owner) {
        return this.tiles.filter(tile => tile.owner === owner);
    }
    
    getTilesByState(state) {
        return this.tiles.filter(tile => tile.state === state);
    }
    
    isPeggingComplete() {
        return this.getTilesByState('played').length === 8;
    }
    
}
