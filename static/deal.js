var dealerKnown = false;
var lastWinner = null;

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
        
        if (lastWinner) {
            this.setFirstDeal();
        }
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
    
    setFirstDeal() {
        const playerName = document.getElementById('playerName').innerHTML;
        if (playerName === lastGameWinner) {
            this.setDealer('opponent');
        } else {
            this.setDealer('player');
        }
        lastWinner = null;
    }
    
    dealerChanged(oldDealer) {
        if (!dealerKnown) {
            // Detect last winner. The oldDealer value will be the player who is
            // NOT the first dealer, which is the last game winner.
            var playerName, opponentName; 
            // Obviously this if/else could be cleaned up a lot.
            if (oldDealer === "player") {
                playerName = lastGameWinner;
                opponentName = lastGameWinner.toLowerCase() === "chris" ? "Jason" : "Chris";
            } else {
                opponentName = lastGameWinner;
                playerName = lastGameWinner.toLowerCase() === "chris" ? "Jason" : "Chris";
            }
            setPlayerNames(playerName, opponentName);
        }
        
        const newDealer = oldDealer === 'player' ? 'opponent' : 'player';
        this.setDealer(newDealer, oldDealer);
    }
    
    setDealer(newDealer, oldDealer) {
        dealerKnown = true;
        this.dealer = newDealer;
        const dealerClasses = document.getElementById('dealerlabel').classList;
        dealerClasses.remove('hidden');
        if (oldDealer) {
            dealerClasses.remove(oldDealer + 'Deal');
        }
        dealerClasses.add(this.dealer + 'Deal');
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
    document.getElementById("opponentName").innerHTML = opponentName;
    localStorage.setItem('playerName', playerName);
}

function setOpponentName(opponentName) {
    var playerName = document.getElementById("playerName").innerHTML;
    const hasPlayerName = playerName && !playerName.trim() === '';
    if (opponentName) {
        if (!hasPlayerName) {
            playerName = getOtherName(opponentName);
        }
        setPlayerNames(playerName, opponentName);
    } else if (hasPlayerName) {
        opponentName = getOtherName(playerName);
        setPlayerNames(playerName, opponentName);
    }
}

function getOtherName(name) {
    return name == 'Chris' ? 'Jason' : 'Chris';
}

function detectFirstDeal(lastGameWinner) {
    lastWinner = lastGameWinner;
    if (currentDeal) {
        currentDeal.setFirstDeal();
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
