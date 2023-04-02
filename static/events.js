var currentDeal = null;
var scoreState = null;

/***** Events that originate on the server side *****/

const socket = io();
socket.on("reset", noGame);

socket.on("hand", function(tiles) {
    const popFunc = function() {
        return populateDeck(tiles);
    }
    doReset().then(popFunc).then(dealTiles);
});

socket.on("opponentCrib", moveOpponentCrib);

socket.on("fullcrib", function(turnTile) {
    // currentDeal.peg.canPlay = (!currentDeal.dealer || currentDeal.dealer === 'opponent');    
    currentDeal.player_hand.setClickTo('peg');
    turn(turnTile);
});

socket.on("opponentPegged", function(cardData) {
    let tile = cardData.card;
    const tileObj = currentDeal.opponent_hand.getLastTile();
    tileObj.update(tile);
    currentDeal.sort();
    currentDeal.peg.addTile(tileObj);
    draw();
    
    if (cardData.go) {
        currentDeal.isGo = true;
        markGoTile();
    } else if (cardData.bummer) {
        markGoTile();
    }
    
    let trayShort = getHandCode(currentDeal.peg.getTiles(), false);
    let counterTotal = getPegScore(trayShort);
    currentDeal.peg.canPlay = counterTotal === 0;
});

socket.on("afterPeg", function(cardData) {
    if (cardData.go) {
        currentDeal.isGo = true;
        markGoTile();
    } else if (cardData.bummer) {
        currentDeal.peg.canPlay = true;
        markGoTile();
    }
        
    if (currentDeal.opponent_hand.getTiles().length === 0) {
        currentDeal.peg.canPlay = true;
    }
    
    updateCounterButtonForPeg();
});

socket.on("showCrib", handleShowCrib);

socket.on("opponentScored", handleOpponentScored);

socket.on("playerInfo", handlePlayerInfo);

socket.on("updateHistory", function(newScore) {
    updateLastHistoryItem('opponent', newScore);
});

socket.on("opponentMessage", function(msg) {
    addMessage(msg, 'opponent');
});

socket.on("toggleDark", function(msg) {
    toggleDark(false);
});

socket.on("quit", function() {
    if (currentDeal) {
        location.reload();
    }
});

/***** Communications back to the server *****/
function sendCribSelected(crib) {
    socket.emit("cribSelected",crib);
}

function sendTilePegged(tile) {
    socket.emit("pegged", tile);
}

function sendShowCrib() {
    socket.emit("cribRequested");
}

function sendShuffle() {
    socket.emit("shuffle");
}

function sendScore(points) {
    socket.emit("score",points);
}

function sendUpdateHistory(newScore) {
    socket.emit("updateHistory",newScore);
}

function emitMessage(msg) {
    socket.emit("message", msg);
}
