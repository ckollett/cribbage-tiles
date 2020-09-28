function dealTiles(tiles) {
    tileObjs = [];
    for (let tile of tiles) {
        tileObjs.push(new Tile(tile,'player'));
    }
    for (let i = 0; i < 6; i++) {
        tileObjs.push(new Tile({'num':0,'suit':''},'opponent'));
    }
    
    const deal = new Deal(tileObjs);
    
    return deal;
}

function draw(delay) {
    if (!delay) {
        delay = 0;
    }
    
    for (let tray of currentDeal.trays) {
        if (tray.needsRedraw) {
            drawTray(tray,delay);
        }
    }
}

function drawTray(tray,delay) {
    const tiles = tray.getTiles();
    const positions = [];
    for (let i = 0; i < tiles.length; i++) {
        positions.push(tray.getPosition(i,tiles[i]));
    }
    console.log('About to draw ' + tiles.length + ' tiles');
    
    if (tiles.length > 0) {
        positionTile(tiles,positions,0,delay);
    }
    tray.needsRedraw = false;
}

function positionTile(tiles,positions,idx,delay) {
    const tileElt = tiles[idx].elt;
    const position = positions[idx];
    tileElt.style.top = position.top;
    tileElt.style.left = position.left;
    if (position.flip) {
        tileElt.classList.add('flip');
    } else {
        tileElt.classList.remove('flip');
    }
    
    if (idx < tiles.length-1) {
        if (delay && delay > 0) {
            setTimeout(function() {
                positionTile(tiles,positions,idx+1,delay);
            },delay);
        } else {
            positionTile(tiles,positions,idx+1);
        }
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
    currentDeal.getTray('deck').addTile(turnTile);
    window.setTimeout(function() {
        turnTile.tileElt.classList.remove('flip');
    }, 500);
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
    const pegTray = currentDeal.getTray('peg');
    for (let tile of pegTray.getTiles()) {
        const newTray = currentDeal.getTray(tile.owner + '_played');
        newTray.addTile(tile);
    }
    pegTray.clear();
    draw();
    
    if (isPeggingComplete()) {
        var actionButton = document.getElementById('thebutton');
        actionButton.innerHTML = 'Show Crib';
        actionButton.onclick = sendShowCrib;
    }
}

function isPeggingComplete() {
    const player = currentDeal.getTray('player_played');
    const opp = currentDeal.getTray('opponent_played');
    return player.getTiles().length === 4 && opp.getTiles().length === 4;
}
