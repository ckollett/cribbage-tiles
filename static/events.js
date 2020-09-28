var currentDeal = null;


/***** Events that originate on the server side *****/

const socket = io();
socket.on("reset", doReset);
socket.on("nogame", doReset);

socket.on("hand", function(tiles) {
    doReset();
    currentDeal = dealTiles(tiles);
    draw(150);
});

socket.on("opponentCrib", function() {
    const tiles = currentDeal.getTray('opponent_hand').getLastTiles(2);
    currentDeal.getTray('crib').addTiles(tiles);
    draw();
});

socket.on("fullcrib", function(turnTile) {
    currentDeal.getTray('player_hand').setClickTo('peg');
    turn(turnTile);
    showGoButton();
});

socket.on("opponentPegged", function(tile) {
    const tileObj = currentDeal.getTray('opponent_hand').getLastTile();
    tileObj.update(tile);
    currentDeal.getTray('peg').addTile(tileObj);
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
    document.getElementById('game').innerHTML = '';
}

function tileMoved(tile, fromTray, toTray) {
    if (fromTray.name === 'crib_selection' || toTray.name === 'crib_selection') {
        const button = document.getElementById('thebutton');
        const selected = currentDeal.getTray('crib_selection').getTiles();
        if (selected.length === 2) {
            button.classList.remove('hidden');
        } else {
            button.classList.add('hidden');
        }
    }
    
    if (toTray.name === 'peg') {
        sendTilePegged(tile.data);
    }
}

function commitCrib() {
    const crib = currentDeal.getTray('crib_selection').getTiles();
    currentDeal.getTray('crib').addTiles(crib);
    draw();
    const button = document.getElementById('thebutton');
    button.classList.add('hidden');
    
    const cribData = [];
    for (let tile of crib) {
        cribData.push(tile.data);
    }
    sendCribSelected(cribData);
}

function checkForMessage(deal) {
    var pegged = deal.getTilesByState('pegged');
    if (pegged.length === 3) {
        pegged.sort((obj1,obj2) => obj1.elt.style.zIndex - obj2.elt.style.zIndex);
        if (pegged[1].getPegValue() === 10 && pegged[0].getPegValue() + pegged[2].getPegValue() === 5) {
            const msgElt = document.getElementById('message');
            msgElt.innerHTML = "It's a trap!";
            msgElt.classList.add('ackbar');
            msgElt.onclick = function() {
                msgElt.innerHTML = "";
                msgElt.classList.remove('ackbar');
                document.getElementById('messagecontainer').style.display = 'none';
                msgElt.onclick = null;
            };
            document.getElementById('messagecontainer').style.display = 'block';
        }
    }
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

function requestCrib() {
    sendShowCrib();
}

function handleShowCrib(crib) {
    revealCrib(crib);
    showShuffleButton();
}

function shuffle() {
    clearTiles();
}