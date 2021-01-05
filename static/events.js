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
	currentDeal.isGo = true;
});

socket.on("showCrib", handleShowCrib);

socket.on("opponentScored", handleOpponentScored);

socket.on("updateHistory", function(newScore) {
    updateLastHistoryItem('opponent', newScore);
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
