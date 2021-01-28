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
    
    if (!isScoringAllowed()) {
        return;
    }
    
    handleScore('player', points);
    sendScore(points);
    resetScoreButtons();
    
	switch (scoreState.toLowerCase()) {
	case 'foot':
		// Need to check if current deal is player, since handleScore advances!
	    if (currentDeal.dealer === 'player') {
			sendShowCrib();
		}
		break;
	case 'crib':
		sendShuffle();
		break;
	}
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
}

function handleScore(player, points) {
    appendHistory(player, points, scoreState);
    currentScore.lastTileMove.scored = true;
        
    positionScoreboard(player);
    updateScore();
    addToHistory();
	
	switch (scoreState.toLowerCase()) {
	case 'nobs':
		if (!currentDeal.dealer) {
			const oldDealer = player === 'opponent' ? 'player' : 'opponent';
			currentDeal.dealerChanged(oldDealer);
		}
		break;
	case 'hand':
		scoreState = 'Foot';
		break;
	case 'peg':
		if (currentDeal.isGo) {
			clearPegging();
			if (isPeggingComplete()) {
				scoreState = 'Hand';
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
    
    const currenthand = document.getElementById('currenthand');
    currenthand.insertBefore(containerElt, currenthand.firstChild);
    
    if (lastScore.type === 'crib') {
        const summaryElt = getHistorySummaryElt();
        const history = document.getElementById('history');
        history.insertBefore(summaryElt, history.firstChild);
        
        currenthand.removeAttribute('id');
        currenthand.classList.add('pasthand');
        const newhand = document.createElement('div');
        newhand.id = 'currenthand';
        history.insertBefore(newhand, summaryElt);
    }
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
    const activeNums = document.getElementsByClassName("activenumbers").item(0);
    activeNums.classList.remove("activenumbers");
    document.getElementsByClassName("scorenumbers").item(0).classList.add("activenumbers");
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
}