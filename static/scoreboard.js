const currentScore = {
    'player' : {
        'total' : 0,
        'peg' : 0,
        'hand' : 0,
        'crib' : 0,
        'nobs' : 0
    },
    'opponent' : {
        'total' : 0,
        'peg' : 0,
        'hand' : 0,
        'crib' : 0,
        'nobs' : 0
    }
}

function score(elt) {
    const points = parseInt(elt.innerHTML);
    handleScore('player', points);
    sendScore(points);
    resetScoreButtons();
}

function handleOpponentScored(points) {
    handleScore('opponent', points);
}

function handleScore(player, points) {
    playerObj = currentScore[player];
    const delta = Math.min(points, 121-playerObj.total);
    playerObj.total += delta;
    playerObj[scoreState.toLowerCase()] += delta;
    currentScore.last = {
        'player' : player,
        'points' : points,
        'delta' : delta,
        'type' : scoreState.toLowerCase()
    };
    
    positionScoreboard();
    updateScore();
    addToHistory();
}

function updateScore() {
    const player = currentScore.last.player;
    const scoreElt = document.getElementById(player + 'score');
    const scoreSummaryElt = document.getElementById(player + 'scoreSummary');
    
    const type = currentScore.last.type;
    const typeElt = document.getElementById(player + scoreState);
    
    playerObj = currentScore[player];
    var remaining = currentScore.last.delta;
    
    if (remaining == 0) {
        return;
    }
    
    const delay = 1500/remaining;
    const increment = function() {
        remaining--;
        scoreElt.innerHTML = (playerObj.total-remaining).toString();
        scoreSummaryElt.innerHTML = (playerObj.total-remaining).toString();
        typeElt.innerHTML = (playerObj[type]-remaining).toString();
        
        if (remaining > 0) {
            setTimeout(increment, delay);
        }
    }
    
    increment();
}


function positionScoreboard() {
    const player = currentScore.last.player;
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
    const player = currentScore.last.player;
    const historyData = {
        'historyScore' : currentScore.last.points,
        'historyType' : currentScore.last.type
    };
    
    const containerElt = createFromTemplate('historyItemTemplate', historyData);
    containerElt.classList.add('history' + player);
    
    const currenthand = document.getElementById('currenthand');
    currenthand.insertBefore(containerElt, currenthand.firstChild);
    
    if (currentScore.last.type === 'crib') {
        const summaryElt = getHistorySummaryElt();
        const history = document.getElementById('history');
        history.insertBefore(summaryElt, history.firstChild);
        
        currenthand.id = null;
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
    const pasthands = document.getElementsByClassName('pasthand');
    for (let pasthand of pasthands) {
        pasthand.classList.toggle('collapsed');
    }
}