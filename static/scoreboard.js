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

function updateScore(player,points,type) {
    if (points === 0) {
        return;
    }
    
    const scoreElt = document.getElementById(player + 'score');
    const oldScore = parseInt(scoreElt.innerHTML);
    const typeElt = document.getElementById(player + type);
    const oldTypeScore = parseInt(typeElt.innerHTML);
    
    const score = Math.min(oldScore + points, 121);
    const pct = score/120;
    
    positionScoreboard(player,pct);
    
    const delay = 1500/Math.abs(score-oldScore);
    const updateObj = {
        "scoreElt" : scoreElt,
        "typeElt" : typeElt,
        "score" : oldScore,
        "typeScore" : oldTypeScore,
        "remaining" : Math.abs(points),
        "delta" : points > 0 ? 1 : -1
    }

    animateScore(updateObj,delay);
}

function positionScoreboard(player,pct) {
    const triangleLeft = 'calc(' + (pct*100).toString() + '% - 1vh)';
    document.getElementById(player + 'triangle').style.left = triangleLeft;
    
    // The scoreboard starts at -3% - 38% and should go to 62% - 103%
    // So left should run from -3 to 65
    const scoreboardLeft = 65*pct-3;
    document.getElementById(player + 'scoreboard').style.left = scoreboardLeft.toString() + '%';
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
        updateObj.score += updateObj.delta;
        updateObj.typeScore += updateObj.delta;
        
        updateObj.scoreElt.innerHTML = updateObj.score;
        updateObj.typeElt.innerHTML = updateObj.typeScore;
        if (--updateObj.remaining > 0) {
            animateScore(updateObj,delay);
        }
    }, delay);
}

function addToHistory(player, points, type, icon) {
    const containerElt = document.createElement('div');
    containerElt.classList.add('historyItem');
    containerElt.classList.add('history' + player);
    
    const scoreElt = document.createElement('span');
    scoreElt.classList.add('historyScore');
    scoreElt.innerHTML = points;
    containerElt.appendChild(scoreElt);
    
    const typeElt = document.createElement('span');
    typeElt.classList.add('historyType');
    typeElt.innerHTML = type;
    containerElt.appendChild(typeElt);
    
    if (icon) {
        const iconElt = document.createElement('span');
        iconElt.classList.add('history' + icon);
        containerElt.appendChild(iconElt);
    }
    
    const history = document.getElementById('history');
    history.insertBefore(containerElt, history.firstChild);
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