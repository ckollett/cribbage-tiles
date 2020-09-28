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

function draw() {
    for (let tray of currentDeal.trays) {
        if (tray.needsRedraw) {
            drawTray(tray);
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
        positionTile(tiles,positions,0);
    }
    tray.needsRedraw = false;
}

function positionTile(tiles,positions,idx) {
    const tileElt = tiles[idx].tileElt;
    const position = positions[idx];
    tileElt.style.top = position.top;
    tileElt.style.left = position.left;
    if (position.flip) {
        tileElt.classList.add('flip');
    } else {
        tileElt.classList.remove('flip');
    }
    
    if (idx < tiles.length-1) {
        positionTile(tiles,positions,idx+1);
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