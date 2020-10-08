var currentDeal = null;


/***** Events that originate on the server side *****/

const socket = io();
socket.on("reset", doReset);

socket.on("hand", function(tiles) {
    const popFunc = function() {
        return populateDeck(tiles);
    }
    doReset().then(popFunc).then(dealTiles);
});

socket.on("opponentCrib", function() {
    const tiles = currentDeal.opponent_hand.getLastTiles(2).reverse();
    currentDeal.crib.addTiles(tiles);
    draw(200);
});

socket.on("fullcrib", function(turnTile) {
    currentDeal.player_hand.setClickTo('peg');
    turn(turnTile);
});

socket.on("opponentPegged", function(tile) {
    const tileObj = currentDeal.opponent_hand.getLastTile();
    tileObj.update(tile);
    currentDeal.sort();
    currentDeal.peg.addTile(tileObj);
    draw();
});

socket.on("go", function() {
    currentDeal.peg.clickTo = acceptGo;
});

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
