var currentDeal = null;


/***** Events that originate on the server side *****/

const socket = io();
socket.on("reset", doReset);
socket.on("nogame", doReset);

socket.on("hand", function(tiles) {
    console.log("In hand");
    const popFunc = function() {
        return populateDeck(tiles);
    }
    doReset().then(popFunc).then(dealTiles);
});

socket.on("opponentCrib", function() {
    const tiles = currentDeal.opponent_hand.getLastTiles(2);
    currentDeal.crib.addTiles(tiles);
    draw();
});

socket.on("fullcrib", function(turnTile) {
    currentDeal.player_hand.setClickTo('peg');
    turn(turnTile);
    showGoButton();
});

socket.on("opponentPegged", function(tile) {
    const tileObj = currentDeal.opponent_hand.getLastTile();
    tileObj.update(tile);
    currentDeal.sort();
    currentDeal.peg.addTile(tileObj);
    draw();
});

socket.on("go", function() {
    document.getElementById('thebutton').onclick = acceptGo;
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

/***** Events that originate on the client side *****/

function doReset() {
    console.log("In doReset");
    if (currentDeal) {
        currentDeal.deck.addTiles(currentDeal.tiles);
        draw();
        return new Promise(resolve => {
            setTimeout(() => {
                currentDeal = null;
                document.getElementById('game').innerHTML = '';
                console.log("Resolving doReset");
                resolve();
            },500);
        })
    } else {
        document.getElementById('game').innerHTML = '';
        return Promise.resolve();        
    }
}

function populateDeck(tiles) {
    currentDeal = new Deal(tiles);
    // TODO: Just put this in the Deal constructor?
    currentDeal.deck.addTiles(currentDeal.tiles);
    draw();
    console.log("In populateDeck");
    return new Promise(resolve => {
        setTimeout(resolve, 100);
    });
}

function commitCrib() {
    const crib = currentDeal.crib_selection.getTiles();
    currentDeal.crib.addTiles(crib);
    draw();
    const button = document.getElementById('thebutton');
    button.classList.add('hidden');
    
    const cribData = [];
    for (let tile of crib) {
        cribData.push(tile.data);
    }
    sendCribSelected(cribData);
}

function requestCrib() {
    sendShowCrib();
}

function handleShowCrib(crib) {
    revealCrib(crib);
    const thebutton = document.getElementById('thebutton');
    thebutton.innerHTML = 'Deal';
    thebutton.onclick = sendShuffle;
}

function shuffle() {
    clearTiles();
}