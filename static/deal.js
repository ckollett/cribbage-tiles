class Deal {
    constructor(dealer) {
        this.dealer = dealer;
        const dealerClasses = document.getElementById('dealerlabel').classList;
        dealerClasses.remove('hidden');
        dealerClasses.remove('playerDeal');
        dealerClasses.remove('opponentDeal');
        dealerClasses.add(dealer + 'Deal');
    }
    
    nextDeal() {
        const nextDealer = this.dealer === 'player' ? 'opponent' : 'player';
        currentDeal = new Deal(nextDealer);
    }
    
    addTiles(tiles) {
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
}

function getPlayerNameFromStorage() {
    const playerName = localStorage.getItem('playerName');
    if (playerName) {
        document.getElementById('playerName').innerHTML = playerName;
    }
    return playerName;
}

function setPlayerNames(playerName, opponentName) {
    dealerKnown = true;
    document.getElementById("playerName").innerHTML = playerName;
    localStorage.setItem('playerName', playerName);
}

function handlePlayerInfo(playerInfo) {
    document.getElementById("opponentName").innerHTML = playerInfo.opponentName;
    
    if (playerInfo.firstDeal) {
        const dealer = playerInfo.opponentName === playerInfo.firstDeal ? 'opponent' : 'player';
        currentDeal = new Deal(dealer);
        startGameTimer();
        finishSetup(playerInfo);
    } else {
        const msgElt = document.getElementById('message');
        msgElt.innerHTML = "Pick a Dealer";
        document.getElementById('messagecontainer').style.display = 'block';    
    }
}

function getTrays(deal) {
    const trays = [];

    // Top row: hand (unplayed and played)
    trays.push(new SortOrderTray(deal, 'player_hand', 0, {'clickTo':'crib_selection', 'zIndex' : 2}));
    trays.push(new SortOrderTray(deal, 'player_played', 0, {'rightSide' : true, 'zIndex' : 2}));

    // Second row: tray, crib, crib_selection, pegging
    trays.push(new PlayOrderTray(deal, 'deck', 1, {'xOffset' : '0', 'flipped':true}));
    trays.push(new CribTray(deal, 'crib', 1, {'trayXOffset':columnWidth, 'xOffset':columnWidth/12, 'flipped':true}));
    trays.push(new CribSelectionTray(deal, 'crib_selection', 1, {'rightSide':true, 'clickTo':'player_hand'}));
    trays.push(new PegTray(deal, 'peg', 1, {'xOffset':columnWidth/2, 'yOffset':3.5, 'rightSide':true}));
    trays.push(new CribDisplayTray(deal, 'crib_display', 1, {'rightSide':true, 'reverseZIndex':true, 'yOffset':2}));
    
    // Third row: player hand
    trays.push(new SortOrderTray(deal, 'opponent_hand', 2, {'flipped':true, 'zIndex' : 2}));
    trays.push(new SortOrderTray(deal, 'opponent_played', 2, {'rightSide':true, 'zIndex' : 2}));
    
    return trays;
}
