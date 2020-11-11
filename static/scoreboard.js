function score(elt) {
    const points = parseInt(elt.innerHTML);
    if (scoreState) {
        updateScore('player',points,scoreState);
        addToHistory('player',points,scoreState);
        sendScore(points);
    }
    resetScoreButtons();
}

function handleOpponentScored(points) {
    updateScore('opponent',points,scoreState);
    addToHistory('opponent',points,scoreState);
}

function updateScore(player,points,scoreState) {
    if (points === 0) {
        return;
    }
    
    const scoreElt = document.getElementById(player + 'score');
    const scoreSummaryElt = document.getElementById(player + 'scoreSummary');
    const oldScore = parseInt(scoreElt.innerHTML);
    const typeElt = document.getElementById(player + scoreState);
    const oldTypeScore = parseInt(typeElt.innerHTML);
    
    const score = Math.min(oldScore + points, 121);
    const pct = score/120;
    
    positionScoreboard(player,pct);
    
    const delay = 1500/Math.abs(score-oldScore);
    const updateObj = {
        "scoreElt" : scoreElt,
        "scoreSummaryElt" : scoreSummaryElt,
        "typeElt" : typeElt,
        "score" : oldScore,
        "typeScore" : oldTypeScore,
        "remaining" : Math.abs(score-oldScore),
        "direction" : points > 0 ? 1 : -1
    }

    animateScore(updateObj,delay);
}

function positionScoreboard(player,pct) {
    const playerBoard = document.getElementById(player + 'scoreboard');
    pctStr = (100*pct).toString() + '%';
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

function animateScore(updateObj,delay) {
    window.setTimeout(() => {
        updateObj.score += updateObj.direction;
        updateObj.typeScore += updateObj.direction;
        
        updateObj.scoreElt.innerHTML = updateObj.score;
        updateObj.scoreSummaryElt.innerHTML = updateObj.score;
        updateObj.typeElt.innerHTML = updateObj.typeScore;
        if (--updateObj.remaining > 0) {
            animateScore(updateObj,delay);
        }
    }, delay);
}

function addToHistory(player, points, icon) {
    const historyData = {
        'historyScore' : points,
        'historyType' : scoreState
    };
    
    const containerElt = createFromTemplate('historyItemTemplate', historyData);
    containerElt.classList.add('history' + player);
    
    const currenthand = document.getElementById('currenthand');
    currenthand.insertBefore(containerElt, currenthand.firstChild);
    
    if (scoreState.toLowerCase() === 'crib') {
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
    const playerScore = document.getElementById('playerscore').innerHTML;
    const opponentScore = document.getElementById('opponentscore').innerHTML;
    const data = {
        'playerHandSummary' : playerScore,
        'opponentHandSummary' : opponentScore
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