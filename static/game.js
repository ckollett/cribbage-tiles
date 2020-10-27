var drawPromise = Promise.resolve();

function dealTiles() {
    for (let tile of currentDeal.tiles) {
        currentDeal[tile.owner + '_hand'].addTile(tile);
    }
        
    draw(200);
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

function clear() {
    drawPromise = drawPromise.then(() => {
        document.getElementById('game').innerHTML = '';
    });
    return drawPromise;
}

function draw(delay) {
    if (!delay) {
        delay = 0;
    }
    
    var wait = false;
    for (let tray of currentDeal.trays) {
        if (tray.shouldRedraw()) {
            tray.needsRedraw = false;
            wait = true;
            const drawFcn = createDrawFcn(tray,delay);
            drawPromise = drawPromise.then(drawFcn);
        }
    }
    
    if (wait) {
        drawPromise = drawPromise.then(resolve => {
            setTimeout(resolve, 500);
        });
    }
    return drawPromise;
}

function createDrawFcn(tray,delay) {
    return function() {
        return drawTray(tray, delay);
    }
}

function drawTray(tray,delay) {
    tray.needsRedraw = false;
    return new Promise(resolve => {
        const tiles = tray.getTilesToDraw();
        const positions = [];
        for (let i = 0; i < tiles.length; i++) {
            positions.push(tray.getPosition(tiles[i]));
        }
        if (tiles.length > 0) {
            positionTile(tiles,positions,0,delay,resolve);
        } else {
            resolve();
        }
    });
}

function positionTile(tiles,positions,idx,delay,resolveFcn) {
    if (!delay) {
        delay = 0;
    }
    
    const tileElt = tiles[idx].elt;
    const position = positions[idx];
    tileElt.style.top = position.top;
    tileElt.style.left = position.left;
    tileElt.style.zIndex = position.zIndex;
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

function commitCrib() {
    drawPromise = drawPromise.then(function() {
        const crib = currentDeal.crib_selection.getTiles().reverse();
        currentDeal.crib.addTiles(crib);
        
        const cribData = [];
        for (let tile of crib) {
            cribData.push(tile.data);
        }
        sendCribSelected(cribData);
        currentDeal.player_hand.setClickTo(null);
        
        draw(200);
    });
}

function moveOpponentCrib() {
    drawPromise = drawPromise.then(function() {
        const tiles = currentDeal.opponent_hand.getLastTiles(2).reverse();
        currentDeal.crib.addTiles(tiles);
        draw(200);
    });
}

function turn(tile) {
    scoreState = 'Peg';
    const turnTile = new Tile(tile,'');
    currentDeal.tiles.push(turnTile);
    currentDeal.deck.flipped = false;
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

function rejectGo() {
    const pegTiles = currentDeal.peg.getTiles();
    const lastPegged = pegTiles[pegTiles.length-1];
    shake(lastPegged.elt);
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
    const pegTiles = pegTray.getTiles().slice();
    for (let tile of pegTiles) {
        const newTray = currentDeal[tile.owner + '_played'];
        newTray.addTile(tile);
    }
    pegTray.clear();
    draw();
    
    if (isPeggingComplete()) {
        scoreState = 'Hand';
        currentDeal.crib.clickTo = sendShowCrib;
    } else {
        currentDeal.peg.clickTo = rejectGo;
    }
        
}

function isPeggingComplete() {
    const player = currentDeal.player_played;
    const opp = currentDeal.opponent_played;
    return player.getTiles().length === 4 && opp.getTiles().length === 4;
}

function revealCrib(oppCrib) {
    scoreState = 'Crib';
    const cribTiles = currentDeal.crib.getTiles().slice();
    const oppTiles = cribTiles.filter(tile => tile.owner === 'opponent');
    oppTiles[0].update(oppCrib[0]);
    oppTiles[1].update(oppCrib[1]);
    
    cribTiles.reverse(); // This is just to make the animation look nice.
    currentDeal.crib.clear();
    currentDeal.crib_display.addTiles(cribTiles);
    draw(250);
}

function tileClicked(tileElt) {
    const tile = tileElt.tile;
    const tray = tile.tray;
    if (tray.clickTo) {
        if (typeof tray.clickTo === 'function') {
            tray.clickTo();
        } else {
            const toTray = currentDeal[tray.clickTo];
            if (toTray) {
                if (toTray.addTile(tile)) {
                    draw();
                } else {
                    shake(tileElt);
                }
            }
        }
    }
}

function noGame() {
    currentDeal = null;
    return drawPromise.then(() => {
        document.getElementById('game').innerHTML = '';
    });
}

function doReset() {
    scoreState = null;
    if (currentDeal) {
        currentDeal.deck.flipped = true;
        
        for (let tray of currentDeal.trays) {
            if (tray.name !== 'deck') {
                const trayTiles = tray.getTiles().slice().reverse();
                currentDeal.deck.addTiles(trayTiles);
            }
        }
        
        currentDeal.crib_display.clear();
        return draw(200).then(() => {
            return clear();
        });
    } else {
        return clear();       
    }
}

function populateDeck(tiles) {
    const oldDealer = currentDeal ? currentDeal.dealer : null;
    currentDeal = new Deal(tiles);
    if (oldDealer) {
        currentDeal.dealerChanged(oldDealer);
    }
    return draw();
}

function handleShowCrib(crib) {
    revealCrib(crib);
    currentDeal.deck.clickTo = sendShuffle;
}