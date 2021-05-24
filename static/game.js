var drawPromise = Promise.resolve();

function dealTiles() {
    for (let tile of currentDeal.tiles) {
        currentDeal[tile.owner + '_hand'].addTile(tile);
    }
        
    draw(150);
}

function renderTile(tile, templateStr) {
    if (!templateStr) {
        templateStr = '#tiletemplate';
    }
    const template = document.querySelector(templateStr);
    const tileElt = template.content.cloneNode(true).firstElementChild;
    
    if (tile.num !== 0) {
        const tileFront = tileElt.querySelector('.tilefront');   
        tileFront.classList.add(tile.suit);
        const tileValue = tileElt.querySelector('.value');
        tileValue.innerHTML = tile.num ? tile.num : tile.value;
    }
    
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
        if (crib.length !== 2) {
            return;
        }
        
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
        const tiles = currentDeal.opponent_hand.getLastTiles(2);
        currentDeal.crib.addTiles(tiles);
        draw(200);
    });
}

function turn(tile) {
    setScoreState('Nobs');
    const turnTile = new Tile(tile,'');
    document.getElementById('game').appendChild(turnTile.elt);
    currentDeal.tiles.push(turnTile);
    currentDeal.deck.flipped = false;
    currentDeal.deck.addTile(turnTile);
    window.setTimeout(function() {
        turnTile.elt.classList.remove('flip');
        if (turnTile.getNum() === 'J') {
            updateCounterButtonForNobs(turnTile);
        }
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

function shake(elt, afterShake) {
    elt.classList.add('rejected');
    setTimeout(function() {
        elt.classList.remove('rejected');
        if (afterShake) {
            afterShake();
        }
    }, 1000);
}

function clearPegging() {
    drawPromise = drawPromise.then(doClearPegging);
}

function doClearPegging() {
    const pegTray = currentDeal.peg;
    const pegTiles = pegTray.getTiles().slice();
    for (let tile of pegTiles) {
        const newTray = currentDeal[tile.owner + '_played'];
        newTray.addTile(tile);
        tile.elt.classList.remove('go');
    }
    pegTray.clear();
	currentDeal.isGo = false;
    draw();
    document.getElementById('pegCounter').classList.add('hidden');
    if (scoreState === 'Peg' && isPeggingComplete()) {
        setScoreState('Hand');
    }
}

function isPeggingComplete() {
    const player = currentDeal.player_played;
    const opp = currentDeal.opponent_played;
    return player.getTiles().length === 4 && opp.getTiles().length === 4;
}

function revealCrib(oppCrib) {
    const cribTiles = currentDeal.crib.getTiles().slice();
    const oppTiles = cribTiles.filter(tile => tile.owner === 'opponent');
    oppTiles[0].update(oppCrib[0]);
    oppTiles[1].update(oppCrib[1]);
    
    cribTiles.reverse(); // This is just to make the animation look nice.
    currentDeal.crib.clear();
    currentDeal.crib_display.addTiles(cribTiles);
    draw(250);
    setScoreState('Crib');
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
    setScoreState('Nobs');
    if (currentDeal) {
        currentDeal.deck.flipped = true;
        for (let turnTile of currentDeal.deck.getTiles()) {
            turnTile.elt.classList.add('flip');
            turnTile.elt.style.zIndex = 2;
        }
        
        const playerTiles = currentDeal.player_played.getTiles().slice().reverse();
        currentDeal.deck.addTiles(playerTiles);
        const cribTiles = currentDeal.crib_display.getTiles().slice().reverse();
        currentDeal.deck.addTiles(cribTiles);
        const opponentTiles = currentDeal.opponent_played.getTiles().slice().reverse();
        currentDeal.deck.addTiles(opponentTiles);
        
        return draw(200).then(() => {
            return clear();
        });
    } else {
		startGameTimer();
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

var gameTimer = null;

function startGameTimer() {
    if (gameTimer) {
        stopGameTimer();
    }
    
	const gameStart = new Date();
	
    if (gameTimer) {
		stopGameTimer();
	}
	
	gameTimer = setInterval(function() {

	  // Get today's date and time
	  var now = new Date();

	  // Find the distance between now and the count down date
	  var distance = now - gameStart;

	  // Time calculations for days, hours, minutes and seconds
	  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
	  minutes = ("0" + minutes).slice(-2);
	  var seconds = Math.floor((distance % (1000 * 60)) / 1000);
	  seconds = ("0" + seconds).slice(-2);

	  // Display the result in the element with id="demo"
	  document.getElementById("gameTime").innerHTML = minutes + ":" + seconds;
	}, 1000);
}

function stopGameTimer() {
	clearInterval(gameTimer);
	gameTimer = null;
}

function handleShowCrib(crib) {
    revealCrib(crib);
}

function markGoTile() {
    document.getElementById('pegCounter').classList.add('go');
}

function setScoreState(state) {
    scoreState = state;
    const counterElt = document.getElementById('counterbutton');
    counterElt.innerHTML = state;
    switch (state) {
    case 'Hand' :
        if (currentDeal.dealer === 'opponent') {
            updateCounterButtonForHand(currentDeal.player_played);
        }
        return;
    case 'Foot' :
        if (currentDeal.dealer === 'player') {
            updateCounterButtonForHand(currentDeal.player_played);
        }
        return;
    case 'Crib' :
        if (currentDeal.dealer === 'player') {
            updateCounterButtonForHand(currentDeal.crib_display);
        }
        return;    
    }
    
    removeData(counterElt);
}

function updateCounterButtonForHand(tray) {
    let trayTiles = tray.getTiles();
    let trayShort = getHandCode(trayTiles, true);
    let counterTotal = getHandScore(trayShort);
    let counterElt = activateCounterButton(counterTotal);
    addHandData(counterElt, tray.getTiles());
}

function updateCounterButtonForPeg() {
    let trayShort = getHandCode(currentDeal.peg.getTiles(), false);
    let counterTotal = getPegScore(trayShort);
    if (counterTotal > 0) {
        let counterElt = activateCounterButton(counterTotal);
        addPegData(counterElt, currentDeal.peg.getTiles());
    }
}

function updateCounterButtonForNobs(tile) {
    debugger;
    let nobsShort = getHandCode([tile], false);
    let counterTotal = 2;
    let counterElt = activateCounterButton(counterTotal);
    addNobsData(counterElt, tile);
}

function activateCounterButton(points) {
    const counterElt = document.getElementById('counterbutton');
    counterElt.classList.add('active');
    counterElt.onclick = function() {
        scorePoints('player', points);
    }
    return counterElt;
}

function removeData(elt) {
    hideScore();
    elt.removeEventListener('mouseover', showPegScore);
    elt.removeEventListener('mouseover', showHandScore);
    elt.removeEventListener('mouseout', hideScore);
    elt.onclick = null;
    elt.classList.remove('active');
}
