class Deal {
    constructor(tiles) {
        tiles.sort((t1,t2) => t1.compareTo(t2));
        this.tiles = tiles;
        this.trays = getTrays(this);
        for (let tile of tiles) {
            this.getTray(tile.owner + '_hand').addTile(tile);
        }
    }
    
    getTilesInTray(name) {
        return this.tiles.filter(tile => tile.getTrayName() === name);
    }
    
    getTray(name) {
        for (let tray of this.trays) {
            if (tray.name === name) {
                return tray;
            }
        }
        return null;
    }
}

function getTrays(deal) {
    const trays = [];

    // Top row: hand (unplayed and played)
    trays.push(new SortOrderTray(deal, 'player_hand', 0, {'clickTo':'crib_selection'}));
    trays.push(new SortOrderTray(deal, 'player_played', 0, {'rightSide' : true}));

    // Second row: tray, crib, crib_selection, pegging
    trays.push(new SortOrderTray(deal, 'deck', 1, {'xOffset' : 0, 'flipped':true}));
    trays.push(new PlayOrderTray(deal, 'crib', 1, {'trayXOffset':columnWidth, 'xOffset':3, 'flipped':true}));
    trays.push(new SortOrderTray(deal, 'crib_selection', 1, {'rightSide':true, 'clickTo':'player_hand'}));
    trays.push(new PlayOrderTray(deal, 'peg', 1, {'xOffset':columnWidth/2, 'yOffset':3, 'rightSide':true}));
    trays.push(new PlayOrderTray(deal, 'crib_display', 1, {'rightSide':true}));
    
    // Third row: player hand
    trays.push(new SortOrderTray(deal, 'opponent_hand', 2, {'flipped':true}));
    trays.push(new SortOrderTray(deal, 'opponent_played', 2, {'rightSide':true}));
    
    return trays;
}
