const currentScore = {
    'player' : {
        'total' : 0,
        'peg' : 0,
        'hand' : 0,
        'foot' : 0,
        'crib' : 0,
        'nobs' : 0
    },
    'opponent' : {
        'total' : 0,
        'peg' : 0,
        'hand' : 0,
        'foot' : 0,
        'crib' : 0,
        'nobs' : 0
    },
    'history' : [],
    'lastTileMove' : null
}

function score(elt) {
    const points = parseInt(elt.innerHTML);

    const editElts = document.getElementsByClassName('edithistory');
    if (editElts.length > 0) {
        updateLastHistoryItem('player', points);
        sendUpdateHistory(points);
        resetScoreButtons();
        return;
    }
    
    if (isScoringAllowed()) {
        scorePoints('player', points);
    }
    
}

function scorePoints(player, points) {
    handleScore(player, points);
    if (player === 'player') {
        sendScore(points);
        resetScoreButtons();
    }
    
    switch (scoreState.toLowerCase()) {
    case 'foot':
        // Need to check if current deal is player, since handleScore advances!
        if (currentDeal.dealer === 'player') {
            sendShowCrib();
        }
        break;
    case 'crib':
        if (!isGameOver()) {
            sendShuffle();
        }
        break;
    }
}

function isGameOver() {
    return currentScore.player.total > 120 || currentScore.opponent.total > 120;
}

function isScoringAllowed() {
    if (!scoreState) {
        return false;
    }

    var state = scoreState.toLowerCase();
    switch (state) {
        case 'peg' : return currentScore.lastTileMove.player === 'player';
        case 'hand' : return currentDeal.dealer === 'opponent';
        case 'foot' : return currentDeal.dealer === 'player';
        case 'crib' : return currentDeal.dealer === 'player';
        case 'nobs' : return !currentDeal.dealer || currentDeal.dealer === 'player';
        default : return true;
    }
}

function handleOpponentScored(points) {
    handleScore('opponent', points);
    if (scoreState === 'Peg' || scoreState === 'Nobs') {
        currentDeal.peg.canPlay = true;
    }
}

function handleScore(player, points) {
    hideMessage();
    appendHistory(player, points, scoreState);
    currentScore.lastTileMove.scored = true;
        
    positionScoreboard(player);
    updateScore();
    addToHistory();
    
    switch (scoreState.toLowerCase()) {
    case 'hand':
        setScoreState('Foot');
        break;
    case 'peg':
        if (currentDeal.isGo) {
            clearPegging();
            if (isPeggingComplete()) {
                setScoreState('Hand');
            }        
        }
        break;
    }
}

function appendHistory(player, points, scoreType) {
    playerObj = currentScore[player];
    const delta = Math.min(points, 121-playerObj.total);
    playerObj.total += delta;
    playerObj[scoreType.toLowerCase()] += delta;
    
    if (playerObj.total == 121) {
        stopGameTimer();
        setWinner(player);
    }
    
    const lastScore = {
        'player' : player,
        'points' : points,
        'delta' : delta,
        'type' : scoreType.toLowerCase()
    };
    currentScore.history.push(lastScore);
}

function updateScore() {
    const lastScore = getLastScoringPlay();
    const player = lastScore.player;
    const scoreElt = document.getElementById(player + 'score');
    const scoreSummaryElt = document.getElementById(player + 'scoreSummary');
    
    const type = lastScore.type;
    // Sooooo ugly. Why did I use camel case?
    const typeUpper = type.charAt(0).toUpperCase() + type.slice(1);
    const typeElt = document.getElementById(player + typeUpper);
    
    playerObj = currentScore[player];
    var remaining = lastScore.delta;
    var dir = remaining/Math.abs(remaining);
    
    if (remaining === 0) {
        return;
    }
    
    const delay = 1500/Math.abs(remaining);
    const increment = function() {
        remaining -= dir;
        scoreElt.innerHTML = (playerObj.total-remaining).toString();
        scoreSummaryElt.innerHTML = (playerObj.total-remaining).toString();
        typeElt.innerHTML = (playerObj[type]-remaining).toString();
        
        if (remaining !== 0) {
            setTimeout(increment, delay);
        }
    }
    
    increment();
    removeData(document.getElementById('counterbutton'));
}

function positionScoreboard(player) {
    const playerBoard = document.getElementById(player + 'scoreboard');
    pctStr = (100*currentScore[player].total/120).toString() + '%';
    playerBoard.style.left = pctStr;
}    

function clearScores() {
    const totals = document.getElementsByClassName("total");
    for (let total of totals) {
        total.innerHTML = 0;
    }
    const subtotals = document.getElementsByClassName("subtotalcell");
    for (let subtotal of subtotals) {
        subtotal.innerHTML = 0;
    }
}

function addToHistory() {
    const lastScore = getLastScoringPlay();
    const player = lastScore.player;
    const currenthand = document.getElementById('currenthand');
    
    const historyData = {
        'historyScore' : lastScore.points,
        'historyType' : lastScore.type
    };
    
    const lastElt = document.getElementById('lastHistory');
    if (lastElt) {
        lastElt.removeAttribute('id');
        lastElt.removeEventListener('click', toggleEditHistory);
    }
    
    const containerElt = createFromTemplate('historyItemTemplate', historyData);
    containerElt.classList.add('history' + player);
    if (player === 'player') {
        containerElt.addEventListener('click', toggleEditHistory);
    }
    
    addTileData(containerElt, player, lastScore.type, lastScore.points);
    currenthand.insertBefore(containerElt, currenthand.firstChild);
    
    if (lastScore.type === 'crib') {
        const summaryElt = getHistorySummaryElt();
        const history = document.getElementById('history');
        history.insertBefore(summaryElt, history.firstChild);
        
        currenthand.removeAttribute('id');
        if (!containerElt.classList.contains('miscount')) {
            currenthand.classList.add('pasthand');
        }
        const newhand = document.createElement('div');
        newhand.id = 'currenthand';
        history.insertBefore(newhand, summaryElt);
    }
}

function addTileData(containerElt, player, scoreType, expPoints) {
    let trayTiles = [];
    switch(scoreType) {
        case 'foot' :
        case 'hand' :
            trayTiles = currentDeal.getTilesInTray(player + '_played');
            addHandData(containerElt, trayTiles, expPoints);
            break;
        case 'crib' :
            trayTiles = currentDeal.getTilesInTray('crib_display');
            addHandData(containerElt, trayTiles, expPoints);
            break;
        case 'peg' :
            // Use getTray('peg').getTiles() to get the tiles in play order.
            trayTiles = currentDeal.getTray('peg').getTiles();
            addPegData(containerElt, trayTiles, expPoints);
            break;
        case 'nobs' :
            let nobsTile = currentDeal.deck.getTiles()[0];
            addNobsData(containerElt, nobsTile);
            break;
    }
}

function addHandData(containerElt, trayTiles, expPoints) {
    let trayShort = getHandCode(trayTiles, true);
    
    let counterTotal = getHandScore(trayShort);
    if (expPoints && counterTotal !== expPoints) {
        containerElt.classList.add('miscount');
    }
    
    containerElt.setAttribute("data-hand", trayShort);
    containerElt.setAttribute("data-counter", counterTotal);
    containerElt.addEventListener('mouseover', showHandScore);
    containerElt.addEventListener('mouseout', hideScore);
}

function addPegData(containerElt, trayTiles, expPoints) {
    let trayShort = getHandCode(trayTiles, false);
    let playersShort = "";
    for (let tile of trayTiles) {
        playersShort += tile.owner.charAt(0);
    }
    
    let counterTotal = getPegScore(trayShort);
    if (expPoints && counterTotal != expPoints) {
        containerElt.classList.add('miscount');
    }
    
    containerElt.setAttribute('data-tiles', trayShort);
    containerElt.setAttribute('data-players', playersShort);
    containerElt.setAttribute('data-go', getGoScore(getHandFromShortHand(trayShort)));
    containerElt.addEventListener('mouseover', showPegScore);
    containerElt.addEventListener('mouseout', hideScore);
}

function addNobsData(containerElt, tile) {
    let nobsShort = getHandCode([tile], false);
    containerElt.setAttribute("data-hand", nobsShort);
    containerElt.setAttribute("data-counter", 2);
    containerElt.addEventListener('mouseover', showNobsScore);
    containerElt.addEventListener('mouseout', hideScore);
}

function getHandCode(trayTiles, inclTurn) {
    trayShort = "";
    for (let trayTile of trayTiles) {
        trayShort += trayTile.data.suit[0] + trayTile.data.num;
    }
    if (inclTurn) {
        turnTile = currentDeal.deck.tiles[0];
        trayShort += turnTile.data.suit[0] + turnTile.data.num;
    }
    return trayShort;
}    

function getHistorySummaryElt() {
    const data = {
        'playerHandSummary' : currentScore.player.total,
        'opponentHandSummary' : currentScore.opponent.total
    };
    return createFromTemplate('historySummaryTemplate', data);
}

function monster() {
    const activeNums = document.getElementsByClassName("activenumbers").item(0);
    activeNums.classList.remove("activenumbers");
    const nextNums = activeNums.nextElementSibling;
    if (nextNums) {
        nextNums.classList.add("activenumbers");
    } else {
        document.getElementsByClassName("scorenumbers").item(0).classList.add("activenumbers");
    }
}

function resetScoreButtons() {
    // const activeNums = document.getElementsByClassName("activenumbers").item(0);
    // activeNums.classList.remove("activenumbers");
    // document.getElementsByClassName("scorenumbers").item(0).classList.add("activenumbers");
}
    
function resetScoreBoard() {
    resetScoreButtons();
    clearScores();
    positionScoreboard("player",0);
    positionScoreboard("opponent",0);
}


function createFromTemplate(templateName, templateData) {
    const template = document.querySelector('#' + templateName);
    const templateElt = template.content.cloneNode(true).firstElementChild;
    
    const props = Object.getOwnPropertyNames(templateData);
    for (let prop of props) {
        const value = templateData[prop];
        templateElt.querySelector('.' + prop).innerHTML = value;
    }
    
    return templateElt;
}

function togglePastHands() {
    document.getElementById('history').classList.toggle('collapsed');
}

function getLastScoringPlay() {
    numHistory = currentScore.history.length;
    if (numHistory > 0) {
        return currentScore.history[numHistory-1];
    } else {
        return null;
    }
}

function getHandScore(shortHand) {
    const hand = getHandFromShortHand(shortHand);
    const scoreGroups = scoreHand(hand);
    return getTotal(scoreGroups);
}

function showNobsScore(evt) {
    const shortTile = evt.currentTarget.getAttribute("data-hand");
    const tile = getHandFromShortHand(shortTile)[0];
    let nobsScore = new ScoringJack(tile.suit, 2);
    document.getElementById('pastscore').innerHTML = getOutputAsTable([nobsScore]);
    const pastTilesElt = document.getElementById('pasttiles');
    pastTilesElt.innerHTML = '';
    let tileElt = renderTile(tile, '#pasthandtiletemplate');
    pastTilesElt.appendChild(tileElt);
    document.getElementById('pasthand').style.display = 'block';
}

function showHandScore(evt) {
    // Maybe only allow history change events on the player's own history items?
    const shortHand = evt.currentTarget.getAttribute("data-hand");
    const hand = getHandFromShortHand(shortHand);
    const score = scoreHand(hand);
    document.getElementById('pastscore').innerHTML = getOutputAsTable(score);
    
    // For display, put the turn first.
    hand.unshift(hand.pop());
    const pastTilesElt = document.getElementById('pasttiles');
    pastTilesElt.innerHTML = "";
    for (let i = 0; i < hand.length; i++) {
        let tile = hand[i];
        let tileElt = renderTile(tile, '#pasthandtiletemplate');
        if (i === 0) {
            tileElt.classList.add('pastturn');
        }
        pastTilesElt.appendChild(tileElt);
    }

    document.getElementById('pasthand').style.display = 'block';
}

function scorePeggingTilesWithGo(tiles, goScore) {
    const scoreGroups = scorePeggingTiles(tiles);
    switch(goScore) {
        case 2 : scoreGroups.push(new ThirtyOne()); break;
        case 1 : scoreGroups.push(new Go()); break;
    }
    return scoreGroups;
}

function getGoScore(tiles) {
    if (currentDeal.isGo) {
        let sumReducer = function(total, tile) {
            // So bad. We have THREE different tile objects?!
            let points = tile.pegValue || tile.number || tile.value;
            return total + Math.min(points,10);
        }
        let total = tiles.reduce(sumReducer, 0);
        return total === 31 ? 2 : 1
    }
    return 0;
}

function getPegScore(shortHand) {
    const pegged = getHandFromShortHand(shortHand);
    const scoreGroups = scorePeggingTilesWithGo(pegged, getGoScore(pegged));
    return getTotal(scoreGroups);
}

function showPegScore(evt) {
    const shortHand = evt.currentTarget.getAttribute('data-tiles');
    const tiles = getHandFromShortHand(shortHand);
    let goPoints = evt.currentTarget.getAttribute('data-go');
    goPoints = goPoints ? parseInt(goPoints) : 0;
    const score = scorePeggingTilesWithGo(tiles, goPoints);
    document.getElementById('pastscore').innerHTML = getOutputAsTable(score);
    
    const players = evt.currentTarget.getAttribute('data-players');
    
    const container = document.createElement('div');
    container.classList.add('pastpeg_container');
    for (let i = 0; i < tiles.length; i++) {
        let tile = tiles[i];
        let p = players.charAt(i);
        let tileElt = renderTile(tile, '#pasthandtiletemplate');
        tileElt.classList.add('pastpeg');
        tileElt.classList.add('pastpeg' + (i+1).toString());
        tileElt.classList.add('pastpeg_' + (p === 'p' ? 'player' : 'opponent'));
        container.appendChild(tileElt);
    }
    // Yuck.
    let containerWidth = (tiles.length)*7 + 6;
    container.style.width = '' + containerWidth + 'vh';
    const pastTilesElt = document.getElementById('pasttiles');
    pastTilesElt.innerHTML = '';
    pastTilesElt.appendChild(container);
    document.getElementById('pasthand').style.display = 'block';
}

function hideScore() {
    document.getElementById('pasthand').style.display = 'none';
}


function toggleEditHistory(evt) {
    // Maybe only allow history change events on the player's own history items?
    const historyElt = evt.currentTarget;
    const scoreElt = historyElt.getElementsByClassName('historyScore').item(0);
    scoreElt.classList.toggle('edithistory');
}

function updateLastHistoryItem(player, newScore) {
    const historyElt = document.getElementById('lastHistory');
    const scoreElt = historyElt.getElementsByClassName('historyScore').item(0);
    const typeElt = historyElt.getElementsByClassName('historyType').item(0);
    
    scoreElt.classList.remove('edithistory');

    const type = typeElt.innerHTML;
    // Check for undefined here rather than just using "if (oldScore)" to 
    // make sure we handle zero correctly.
    const oldScore = parseInt(scoreElt.innerHTML);
    const delta = newScore - oldScore;

    scoreElt.innerHTML = newScore;
    // The history object will contain both the original score and
    // the correction. Is that OK?
    appendHistory(player, delta, type);
    updateScore();
    positionScoreboard(player);    
    
    if (type === 'crib') {
        // We also need to update the last score summary in the history.
        summaryElt = document.getElementsByClassName(player + 'HandSummary').item(0);
        summaryElt.innerHTML = currentScore[player].total;
    }
    
    let countedScore = historyElt.getAttribute("data-counter");
    if (!countedScore || parseInt(countedScore) === newScore) {
        historyElt.classList.remove("miscount");
        if (type === 'crib') {
            historyElt.parentElement.classList.add('pasthand');
        }
    } else {
        historyElt.classList.add("miscount");
    }
}

function setWinner(player) {
    let winnerName = document.getElementById(player + "Name").innerHTML;
    let loserScore = Math.min(currentScore.player.total, currentScore.opponent.total);
    let gameTime = document.getElementById("gameTime").textContent;
    let dateStr = new Date().toLocaleDateString("en-US");
    
    const winnerDiv = document.getElementById("winnername");
    winnerDiv.innerHTML = winnerName;
    
    sheetCells = document.getElementById("cribsheetdata").cells;
    sheetCells[0].innerHTML = dateStr;
    sheetCells[1].innerHTML = winnerName;
    sheetCells[2].innerHTML = loserScore;
    sheetCells[3].innerHTML = "0:" + gameTime;
    sheetCells[4].innerHTML = "Web App";

    document.getElementById('winner').style.display = 'block';
}

function copyCribsheet() {
    const table = document.getElementById('cribsheettable');
    table.focus();
    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.moveToElementText(table);
        range.select();
    } else if (window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(table);
        selection.removeAllRanges();
        selection.addRange(range);
    }    
    document.execCommand('copy');
    document.getElementById('cribsheettable').classList.add('highlight');
    setTimeout(function() {
        document.getElementById('cribsheettable').classList.remove('highlight');
    }, 200);
    document.getElementById('copybutton').innerHTML = 'Copied';
}

