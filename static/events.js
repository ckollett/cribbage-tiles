var currentDeal = null;


/***** Events that originate on the server side *****/

const socket = io();
socket.on("reset", doReset);
socket.on("nogame", doReset);

socket.on("hand", function(tiles) {
    doReset();
    const tileObjs = [];
    for (let tile of tiles) {
        const tileObj = new Tile(tile,'player');
        tileObjs.push(tileObj);
    }
    
    // Just draw blank tiles for the opponent for now.
    for (let i = 0; i < 6; i++) {
        const tileObj = new Tile({num:"",suit:""},'opponent');
        tileObjs.push(tileObj);
        flip(tileObj);
    }
    
    showSendCribButton();
    currentDeal = new Deal(tileObjs);
    
    // Wait until all of the tiles are dealt and sorted 
    // before adding them to the DOM. That way they will
    // be in the DOM in sort order and z-index issues
    // become much easier!
    for (let tileObj of currentDeal.tiles) {
        addTile(tileObj.tileElt);
    }
    
    updateTilePositions(currentDeal);
    enableSelection(currentDeal);
});

socket.on("opponentCrib", function() {
    moveOpponentCrib(currentDeal);
});

socket.on("fullcrib", function(turn) {
    showTurn(turn);
    updateTilePositions(currentDeal);
    enablePegging(currentDeal);
});

socket.on("opponentPegged", opponentPegged);

socket.on("go", () => allowGo());

socket.on("clearPegging", clearPegging);

socket.on("showCrib", handleShowCrib);

/***** Communications back to the server *****/
function sendCribSelected(crib) {
    socket.emit("cribSelected",crib);
}

function sendTilePegged(tile) {
    socket.emit("pegged", tile);
}

function sendClearPegging() {
    socket.emit("clearPegging");
}

function sendShowCrib() {
    socket.emit("cribRequested");
}

function sendShuffle() {
    socket.emit("shuffle");
}

/***** Events that originate on the client side *****/

function doReset() {
    document.getElementById('game').innerHTML = '';
}

function toggleCribSelection(tileObj) {
    tileObj.toggleSelection();
    updateTilePositions(currentDeal);
    setButtonEnabled(currentDeal.getNumSelected() === 2);
}

function commitCrib() {
    const prevInCrib = currentDeal.getTilesByState('crib').length;
    const crib = [];
    const cribObjs = currentDeal.moveSelectedToCrib();
    positionCribTiles(cribObjs,prevInCrib);
    for (let cribObj of cribObjs) {
        crib.push(cribObj.tile);
    }
    
    disableSelection(currentDeal);
    hideButton();
    sendCribSelected(crib);
}

function handlePeg(tileObj) {
    if (tileObj.owner === 'player') {
        if (!validatePeg(tileObj)) {
            rejectPeg(tileObj.tileElt);
            return;
        }
        disableTilePegging(tileObj);
        sendTilePegged(tileObj.tile);
    }
    
    const numPegged = currentDeal.getNumPegged();
    tileObj.state = 'pegged';
    movePeggedTile(tileObj, numPegged);
    updateTilePositions(currentDeal);
}

// TODO: Where does this go?
function validatePeg(tileObj) {
    var total = tileObj.getPegValue();
    const pegged = currentDeal.getPeggedTiles();
    for (let tile of pegged) {
        total += tile.getPegValue();
    }
    return total <= 31;
}

function opponentPegged(tile) {
    const oppHand = currentDeal.getTiles('opponent','hand');
    pegged = oppHand[oppHand.length-1];
    pegged.tile = tile;
    updateTileElt(pegged.tileElt, tile);
    pegged.tileElt.classList.remove('flip');
    handlePeg(pegged);
}

function handleGo() {
    clearPegging();
    sendClearPegging();
}

function clearPegging() {
    currentDeal.sort();
    const pegged = currentDeal.getPeggedTiles();
    for (let tile of pegged) {
        tile.state = 'played';
    }
    updateTilePositions(currentDeal);
    
    if (currentDeal.isPeggingComplete()) {
        showCribButton();
    } else {
        showGoButton();
    }
}

function requestCrib() {
    sendShowCrib();
}

function handleShowCrib(crib) {
    revealCrib(crib);
    showShuffleButton();
}

function shuffle() {
    clearTiles();
    sendShuffle();
}