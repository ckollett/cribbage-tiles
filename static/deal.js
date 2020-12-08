class Deal {
    constructor(tiles) {
        const tileObjs = [];
        for (let tile of tiles) {
            tileObjs.push(new Tile(tile,'player'));
        }
        for (let i = 0; i < 6; i++) {
            tileObjs.push(new Tile({'num':0,'suit':''},'opponent'));
        }
        
        this.tiles = tileObjs;
        this.sort();
        
        // Wait until the tiles are sorted to add them to the DOM.
        const gameElt = document.getElementById('game');
        for (let tile of this.tiles) {
            gameElt.appendChild(tile.elt);
        }
        
        this.trays = getTrays(this);
        for (let tray of this.trays) {
            this[tray.name] = tray;
        }
        this.deck.addTiles(this.tiles);
    }
    
    getTilesInTray(name) {
        return this.tiles.filter(tile => tile.getTrayName() === name);
    }
    
    getTray(name) {
        return this[name];
    }
    
    sort() {
        this.tiles.sort((t1,t2) => t1.compareTo(t2));
    }
    
    dealerChanged(oldDealer) {
        this.dealer = oldDealer === 'player' ? 'opponent' : 'player';
        const dealerClasses = document.getElementById('dealerlabel').classList;
        dealerClasses.remove('hidden');
        dealerClasses.remove(oldDealer + 'Deal');
        dealerClasses.add(this.dealer + 'Deal');
    }
}

function getTrays(deal) {
    const trays = [];

    // Top row: hand (unplayed and played)
    trays.push(new SortOrderTray(deal, 'player_hand', 0, {'clickTo':'crib_selection', 'zIndex' : 2}));
    trays.push(new SortOrderTray(deal, 'player_played', 0, {'rightSide' : true, 'zIndex' : 2}));

    // Second row: tray, crib, crib_selection, pegging
    trays.push(new SortOrderTray(deal, 'deck', 1, {'xOffset' : '0', 'flipped':true}));
    trays.push(new CribTray(deal, 'crib', 1, {'trayXOffset':columnWidth, 'xOffset':columnWidth/6, 'flipped':true}));
    trays.push(new CribSelectionTray(deal, 'crib_selection', 1, {'rightSide':true, 'clickTo':'player_hand'}));
    trays.push(new PegTray(deal, 'peg', 1, {'xOffset':columnWidth/2, 'yOffset':3.5, 'rightSide':true, clickTo:rejectGo}));
    trays.push(new PlayOrderTray(deal, 'crib_display', 1, {'rightSide':true, 'reverseZIndex':true}));
    
    // Third row: player hand
    trays.push(new SortOrderTray(deal, 'opponent_hand', 2, {'flipped':true, 'zIndex' : 2}));
    trays.push(new SortOrderTray(deal, 'opponent_played', 2, {'rightSide':true, 'zIndex' : 2}));
    
    return trays;
}
