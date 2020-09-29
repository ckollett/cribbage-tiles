function dealTiles() {
    console.log("In dealTiles");
    for (let tile of currentDeal.tiles) {
        currentDeal[tile.owner + '_hand'].addTile(tile);
    }
    
    const thebutton = document.getElementById('thebutton');
    thebutton.innerHTML = 'Send to Crib';
    thebutton.classList.add('hidden');
    thebutton.onclick = commitCrib;
    
    draw(200);
}

function draw(delay) {
    if (!delay) {
        delay = 0;
    }
    
    const resolveFcn = function(resolve) {
        for (let tray of currentDeal.trays) {
            if (tray.needsRedraw) {
                drawTray(tray,delay,resolve);
            }
        }
    };
    
    return new Promise(resolveFcn);
}

function drawTray(tray,delay,resolveFcn) {
    const tiles = tray.getTiles();
    const positions = [];
    for (let i = 0; i < tiles.length; i++) {
        positions.push(tray.getPosition(i,tiles[i]));
    }
    if (tiles.length > 0) {
        positionTile(tiles,positions,0,delay,resolveFcn);
    }
    tray.needsRedraw = false;
}

function positionTile(tiles,positions,idx,delay,resolveFcn) {
    if (!delay) {
        delay = 0;
    }
    
    const tileElt = tiles[idx].elt;
    const position = positions[idx];
    tileElt.style.top = position.top;
    tileElt.style.left = position.left;
    tileElt.style.zIndex = idx + 2;
    if (position.flip) {
        tileElt.classList.add('flip');
    } else {
        tileElt.classList.remove('flip');
    }
    
    if (idx < tiles.length-1) {
        setTimeout(() => positionTile(tiles,positions,idx+1,delay,resolveFcn), delay);
    } else {
        resolveFcn();
    }
}

function renderTile(tile) {
    const template = document.querySelector('#tiletemplate');
    const tileElt = template.content.cloneNode(true).firstElementChild;
    
    if (tile.num !== 0) {
        const tileFront = tileElt.querySelector('.tilefront');   
        tileFront.classList.add(tile.suit);
        const tileValue = tileElt.querySelector('.value');
        tileValue.innerHTML = tile.num;
    }
    
    document.getElementById('game').appendChild(tileElt);
    return tileElt;
}

function turn(tile) {
    const turnTile = new Tile(tile,'');
    currentDeal.deck.addTile(turnTile);
    window.setTimeout(function() {
        turnTile.elt.classList.remove('flip');
    }, 500);
}

function checkForMessage() {
    var pegged = currentDeal.peg.getTiles();
    if (pegged.length === 3) {
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
    return true;
}

function showGoButton() {
    const button = document.getElementById('thebutton');
    button.innerHTML = 'Go';
    button.onclick = rejectGo;
    button.classList.remove('hidden');
}

function rejectGo() {
    var actionButton = document.getElementById('thebutton');
    actionButton.innerHTML = "Nope";
    shake(actionButton, () => actionButton.innerHTML = "Go");
}

function shake(elt, afterShake) {
    elt.classList.add('rejected');
    setTimeout(function() {
        elt.classList.remove('rejected');
        if (afterShake) {
            afterShake();
        }
    }, 1000);
}

function acceptGo() {
    clearPegging();
    sendClearPegging();
}    

function clearPegging() {
    const pegTray = currentDeal.peg;
    for (let tile of pegTray.getTiles()) {
        const newTray = currentDeal[tile.owner + '_played'];
        newTray.addTile(tile);
    }
    pegTray.clear();
    draw();
    
    var actionButton = document.getElementById('thebutton');
    if (isPeggingComplete()) {
        actionButton.innerHTML = 'Show Crib';
        actionButton.onclick = sendShowCrib;
    } else {
        actionButton.onclick = rejectGo;
    }
        
}

function isPeggingComplete() {
    const player = currentDeal.player_played;
    const opp = currentDeal.opponent_played;
    return player.getTiles().length === 4 && opp.getTiles().length === 4;
}

function revealCrib(oppCrib) {
    const cribTiles = currentDeal.crib.getTiles();
    const oppTiles = cribTiles.filter(tile => tile.owner === 'opponent');
    oppTiles[0].update(oppCrib[0]);
    oppTiles[1].update(oppCrib[1]);
    
    cribTiles.reverse(); // Just for the animation.
    currentDeal.crib_display.addTiles(cribTiles);
    draw(250);
}