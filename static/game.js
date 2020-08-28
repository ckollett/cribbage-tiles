var socket = io();

var numSelections = 2;

/* ************************************************** */
/* Handle messages from the server */

socket.on("reset", doReset);
socket.on("nogame", doReset);

socket.on("hand", function(data) {
    doReset();
    numSelections = 2;
    document.getElementById("thebutton").disabled = true;
    data.sort(compareTiles);
    for (var i = 0; i < data.length; i++) {
        (function(idx) {
            var tile = renderTile(data[idx]);
            document.getElementById("tiles").appendChild(tile);
        })(i);
    }
    eachTileInTray('tiles',enableCribSelection);
});

socket.on("fullcrib", function(turn) {
    showTurn(turn);
    enablePegging();
});

socket.on("opponentPegged", function(tile) {
    document.getElementById("opponentPegContainer").classList.remove("hidden");
    var tile = renderTile(tile);
    addPeggedTileStyles(tile);
    tile.classList.add("opponent");
    moveTile(tile,'crib',false);
});

socket.on("go", handleGo);

socket.on("clearPegging", clearPegging);

socket.on("showCrib", function(crib) {
    revealCrib(crib);
});

/* ************************************************** */
/* Game events */

function doReset() {
    document.getElementById("playerHandLabel").innerHTML = "Hand";
    var trays = document.getElementsByClassName("tray");
    for (let tray of trays) {
        tray.innerHTML = "";
    }

    //hideTrays(["playerPegContainer","opponentPegContainer"]);
    document.getElementById("thebutton").innerHTML = "Send to Crib";
    document.getElementById("thebutton").onclick=commitCrib;
    disableSortingOnPegTrays();
}

function quit() {
    socket.emit('leave');
}

function commitCrib() {
    eachTileInTray('tiles',disableSelection);

    var crib = [];
    var cribTiles = document.getElementsByClassName("crib");
    while (cribTiles.length > 0) {
        var cribTile = cribTiles.item(0);
        cribTile.remove();
        crib.push(cribTile.tile);
    }
    var actionButton = document.getElementById("thebutton");
    actionButton.classList.add("hidden");
    socket.emit("cribSelected",crib);
}

function rejectGo() {
    var actionButton = document.getElementById("thebutton");
    actionButton.innerHTML = "Nope";
    actionButton.classList.add("rejected");
    setTimeout(function() {
        actionButton.innerHTML = "Go";
        actionButton.classList.remove("rejected");
    }, 1000);
}

function showTurn(turn) {
    const turnTile = renderTile(turn);
    moveTile(turnTile,'turn');
}

function enablePegging() {
    numSelections = 0;
    eachTileInTray('tiles',enablePegSelection);
    
    var actionButton = document.getElementById("thebutton");
    actionButton.classList.remove("hidden");
    actionButton.disabled = false;
    actionButton.innerHTML = "Go";
    actionButton.onclick = rejectGo;
}

function peg(pegTile) {
    if (checkPegTotal(pegTile)) {
        pegTile.onclick = null;
        addPeggedTileStyles(pegTile);
        pegTile.classList.add('player');
        moveTile(pegTile, 'crib');
        socket.emit("pegged",pegTile.tile);
    } else {
        pegTile.classList.add('rejected');
        setTimeout(function() {
            pegTile.classList.remove('rejected');
        },1000);
    }
}

function getTilePegValue(tile) {
    switch (tile.num) {
        case 'J' :
        case 'Q' :
        case 'K' : return 10;
        default : return tile.num;
    }
}

function checkPegTotal(pegTile) {
    var pegged = 0;

    var peggedTiles = getTilesFromTray("crib");
    for (let tile of peggedTiles) {
        pegged += getTilePegValue(tile);
    }
    
    return getTilePegValue(pegTile) + pegged <= 31;
}

function addPeggedTileStyles(pegTile) {
    const numPegged = getTilesFromTray('crib').length;
    pegTile.classList.add('pegged');
    pegTile.style.zIndex = (numPegged+1).toString();
    pegTile.style.right = 'calc(var(--pegged-tile-shift)*' + (numPegged/2).toString() + ')';
}

function removePeggedTileStyles(pegTile) {
    pegTile.classList.remove('pegged');
    pegTile.style.zIndex = '';
    pegTile.style.left = '';
}

function handleGo() {
    var actionButton = document.getElementById("thebutton");
    actionButton.disabled = false;
    actionButton.innerHTML = "Go";
    actionButton.onclick = function() {
        socket.emit("clearPegging");
        clearPegging();
    };
}

function clearPegging() {
    const lastGo = countCardsInTrays(['peg1','peg2','crib']) === 8;
    
    var playerTiles = document.getElementById('crib').getElementsByClassName('player');
    for (var i = playerTiles.length-1; i >= 0; i--) {
        var tile = playerTiles.item(i);
        removePeggedTileStyles(tile);
        moveTile(tile,'peg1',true);
    }
    
    var oppTiles = document.getElementById('crib').getElementsByClassName('opponent');
    for (var i = oppTiles.length-1; i >= 0; i--) {
        var tile = oppTiles.item(i);
        removePeggedTileStyles(tile);
        moveTile(tile,'peg2',true);
    }   

    updateButtonAfterGo(lastGo);
}

function countCardsInTrays(trays) {
    var total = 0;
    for (let tray of trays) {
        total += getTilesFromTray(tray).length;
    }
    return total;
}

function updateButtonAfterGo(lastGo) {
    var actionButton = document.getElementById("thebutton");
    if (lastGo) {
        actionButton.disabled = false;
        actionButton.onclick = function() {
            socket.emit("cribRequested");
        }
        actionButton.innerHTML = "Show Crib";
        numSelections = 0;
    } else {
        enablePegging();
    }
}

function revealCrib(crib) {
    for (var tile of crib) {
        document.getElementById("crib").appendChild(renderTile(tile));
    }
    var actionButton = document.getElementById("thebutton");
    actionButton.disabled = false;
    actionButton.innerHTML = "Shuffle";
    actionButton.onclick = shuffle;
}

function shuffle() {
    socket.emit("shuffle");
}

/* ************************************************** */
/* Update UI states */

/* The button */
function updateButtonState(selectedClass) {
    var numSelected = document.getElementsByClassName(selectedClass).length;
    document.getElementById("thebutton").disabled = (numSelected !== numSelections);
}

/* Tile click behaviors */
function eachTileInTray(tray,action) {
    const tiles = getTilesFromTray(tray);
    for (let tile of tiles) {
        action(tile);
    }
}

function enablePegSelection(tile) {
    tile.onclick = function() {
        peg(tile);
    };
}

function enableCribSelection(tile) {
    tile.onclick=function() {
        tile.classList.toggle("crib");
        if (tile.classList.contains("crib")) {
            moveTile(tile,"crib",true);
        } else {
            moveTile(tile,"tiles",true);
        }
        updateButtonState("crib");
    };
}

function disableSelection(tile) {
    tile.onclick = null;
}

/* On-click sorting for trays */
function enableSortingOnPegTrays() {
    var trayContainers = document.getElementsByClassName("sortable");
    for (let trayContainer of trayContainers) {
        enableTraySorting(trayContainer);
    }
}

function enableTraySorting(trayContainer) {
    const labelElt = trayContainer.getElementsByClassName("label").item(0);
    const trayElt = trayContainer.getElementsByClassName("tray").item(0);
    labelElt.onclick = function() {
        sortTray(trayElt.id);
    }
}

function disableSortingOnPegTrays() {
    var trayContainers = document.getElementsByClassName("sortable");
    for (let trayContainer of trayContainers) {
        disableTraySorting(trayContainer);
    }
}

function disableTraySorting(trayContainer) {
    const labelElt = trayContainer.getElementsByClassName("label").item(0);
    labelElt.onclick = null;
}

/* Trays */
function hideTrays(trays) {
    for (let tray of trays) {
        hideTray(tray);
    }
}

function hideTray(tray) {
    document.getElementById(tray).classList.add("hidden");
}

function showTrays(trays) {
    for (let tray of trays) {
        showTray(tray);
    }
}

function showTray(tray) {
    document.getElementById(tray).classList.remove("hidden");
}


function getTilesFromTray(tray) {
    return document.getElementById(tray).children;
}

function sortTray(trayId) {
    var tiles = getTilesFromTray(trayId);
    for (tile of tiles) {
        moveTile(tile, trayId, true);
    }
}

function moveTile(tile, tray, sorted) {
    const trayElt = document.getElementById(tray);
    tile.remove();
    if (sorted) {
        const trayTiles = getTilesFromTray(tray);
        for (trayTile of trayTiles) {
            if (compareTiles(tile,trayTile) < 0) {
                trayElt.insertBefore(tile,trayTile);
                return;
            }
        }
        // If we get here this must be the "biggest" tile in the tray.
        trayElt.appendChild(tile);
    } else {
        trayElt.insertAdjacentElement('afterbegin',tile);
    }
}

function removeGoSeparators() {
    const seps = document.getElementsByClassName('go');
    for (var i = seps.length-1; i >= 0; i--) {
        seps.item(i).remove();
    }
}

/* Individual tiles */
function renderTile(tile) {
    var tileElt = document.createElement("div");
    tileElt.classList.add("tile");
    tileElt.classList.add(tile.suit);
    
    var value = document.createElement("div");
    value.classList.add("value");
    value.innerHTML = tile.num;
    tileElt.appendChild(value);
    
    var outer = document.createElement("div");
    outer.classList.add("tileborder");
    outer.appendChild(tileElt);
    outer.tile = tile;    
    outer.num = tile.num;
    outer.suit = tile.suit;
    
    return outer;
}

// The tiles can either be data from the server or a tile container element
function compareTiles(tile1, tile2) {
    var byNum = getTileSortValue(tile1)-getTileSortValue(tile2);
    if (byNum === 0) {
        return tile1.suit.localeCompare(tile2.suit);
    } else {
        return byNum;
    }
}

function getTileSortValue(tile) {
    switch (tile.num) {
        case 'J' : return 11;
        case 'Q' : return 12;
        case 'K' : return 13;
        default : return tile.num;
    }
}

function createGoSeparator() {
    var container = document.createElement("div");
    container.classList.add('label');
    container.classList.add('go');
    
    var elt = document.createElement("div");
    elt.classList.add('rightlabel');
    elt.innerHTML = 'GO';

    container.appendChild(elt);
    return container;
}