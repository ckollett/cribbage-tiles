// TODO:
// Put events in a queue that is only flushed
// when no animation is underway? This isn't a
// big deal, just a potential bit of polish.

const animationTime = 500;

let thisPlayer;
let gamePhase;
let clickingEnabled = true;

window.addEventListener("load", setUp);

const socket = io();
function setUp() {
    socket.emit('checkForGame', {}, function(gameData) {
        thisPlayer = gameData.id;
        if (gameData.opponent) {
            updateJoinForm(gameData.opponent);
        } else {
            updateJoinForm(null)
        }
    });
    
    socket.on('opponentJoined', function(opponent) {
        console.log('Opponent joined');
        updateJoinForm(opponent);
    });
}

function joinGame(firstDeal) {
    document.getElementById('join').classList.add('hidden');
    document.getElementById('layout').classList.add('active');
    populateDeck();
    socket.emit('join', {firstDeal: firstDeal});
}

function updateJoinForm(opponent) {
    if (opponent) {
        document.getElementById('join_header').innerHTML = 'Join Game';
        const oppDealButton = opponent.firstDeal ? 'deal1' : 'deal2';
        document.getElementById(oppDealButton).disabled = true;
    }
}

const gameEventHandlers = {
    deal : handleDealEvent,
    cribselect : opponentThrewToCrib,
    turn : (data) => turn(data.tiles[0]),
    peg : handlePegEvent,
    cribreveal : (data) => revealCrib(data.tiles),
    score : handleScoreEvent
}


function handleDealEvent(data) {
    const dealerName = getPlayerName(data.dealer);
    const dealerLabel = document.getElementById('dealerlabel');
    dealerLabel.className = 'row_' + dealerName;
    if (getTray('deck').numTiles() === 13) {
        dealTiles(data.tiles);
    } else {
        clearTiles().then(function() {
            dealTiles(data.tiles);
        });
    }
}

function handlePegEvent(data) {
    let addGo = false;
    if (data.tiles && data.tiles.length === 1) {
        // The opponent just pegged. It could be your turn.
        opponentPegged(data.tiles[0]);
    } 
    // If this player just pegged and the opponent is now
    // at go, give an indication.
    if (data.phase.data.go) {
        document.getElementById('pegcount').classList.add('go');
    } else {
        document.getElementById('pegcount').classList.remove('go');
    }
}

function handleScoreEvent(data) {
    const phaseName = data.phase.name;
    if (phaseName === 'counthands' || (phaseName === 'pegging' && data.phase.data.count == 0)) {
        clearPeggingTray();
    }
    updateScoreBoard(data);    
}

socket.on('gameEvent', function(data) {
    if (!data.name) {
        return;
    }
    if (data.phase) {
        gamePhase = data.phase;
    }

    const handler = gameEventHandlers[data.name];
    if (handler) {
        handler(data);
    }

    // Using == instead of === checks for both null and undefined.
    clickingEnabled = data.pendingScore == null;
    const scoringDisabled = clickingEnabled || data.pendingScore !== thisPlayer;
    setScoreButtonState(scoringDisabled);
});


// Events are going to come from the server with player
// IDs of 0 and 1. For CSS styling, we want this player's
// tiles on top. We'll use "self" styles for the top row
// and "opponent" styles for the bottom row.
function getPlayerName(num) {
    return num == thisPlayer ? 'self' : 'opponent';
}

/* ********** Trays ********** */

class Tray {
    // When adding tiles, keep track of the trays we
    // removed the tiles from. When we move tiles into
    // a new tray we need to update the old tray, as well.
    #sourceTrays = new Set();
    
    constructor({baseName, side, player, sort, maxTiles = 13}) {
        this.baseName = baseName;
        this.side = side;
        this.player = player;
        this.sortFunc = sort;

        const trayClass = 'tray_' + this.baseName;
        const row = this.player ? this.player : 'middle';
        this.trayClasses = [trayClass, 'row_' + row];
        if (this.side) {
            this.trayClasses.push('side_' + this.side);
        }
        this.maxTiles = maxTiles;
    }
    
    getId() {
        return this.player ? this.baseName + '_' + this.player : this.baseName;
    }
    
    addTile(tileElement) {
        if (this.numTiles() >= this.maxTiles) {
            return false;
        }
        
        const oldTray = getTray(tileElement.dataset.tray);
        if (oldTray) {
            this.#sourceTrays.add(oldTray);
        }
        tileElement.dataset.tray = this.getId();
        tileElement.dataset.moving = "1";
        tileElement.dataset.addedIdx = this.numTiles();
        return true;
    }
    
    #getTilesUnsorted() {
        // Use the data attribute rather than the classname so that
        // we can get the tiles before they are moved.
        return document.querySelectorAll(`[data-tray='${this.getId()}`);
    }
    
    numTiles() {
        return this.#getTilesUnsorted().length;
    }
    
    getTileElements() {
        const tileElts = Array.from(this.#getTilesUnsorted());
        if (this.sortFunc) {
            tileElts.sort(this.sortFunc);
        }
        return tileElts;
    }
    
    #updateSourceTrays() {
        const sourceTrays = Array.from(this.#sourceTrays);
        this.#sourceTrays.clear();
        sourceTrays.forEach(t => t.moveTilesNow());
    }
    
    // Move all of the same time, and return a promise that should resolve
    // when the tiles have finished moving.
    moveTilesNow() {
        this.#updateSourceTrays();
        const elements = this.getTileElements();
        const that = this;
        elements.forEach((elt, idx) => that.#moveTile(elt, idx));
    }
    
    #moveTile(tileElt, idx) {
        this.beforeTileMove(tileElt);
        tileElt.className = 'tileposition';
        tileElt.classList.add(...this.trayClasses);
        tileElt.classList.add('tileidx_' + idx);
        if (tileElt.dataset.moving == 1) {
            // Keep the tile in front of other tiles while it's moving.
            tileElt.classList.add('moving');
            tileElt.dataset.moving = '';
            const that = this;
            setTimeout(() => {
                tileElt.classList.remove('moving');
                that.afterTileMove(tileElt);
            }, animationTime);
        }
    }
    
    beforeTileMove(tileElt) {}
    afterTileMove(tileElt) {}
    
    moveTilesSequentially(delay = 0) {
        this.#updateSourceTrays();
        const tileElts = this.getTileElements();
        if (tileElts.length === 0) {
            return Promise.resolve();
        }
        
        this.toMove = tileElts;
        const promise = new Promise(resolve => {
            this.#moveTileInSequence(0, delay, resolve);
        });
        return promise;
    }
    
    #moveTileInSequence(idx, delay, resolve) {
        const tileElt = this.toMove.shift();
        this.#moveTile(tileElt, idx);
        
        let next;
        if (this.toMove.length > 0) {
            setTimeout(() => this.#moveTileInSequence(idx+1, delay, resolve), delay);
        } else {
            // After moving the last tile, wait until the animation is finished.
            setTimeout(resolve, animationTime);
        }
    }
}

// The pegging tray is special because we add affordances to show the current count.
class PeggingTray extends Tray {
    constructor() {
        super({baseName: 'pegged', sort: sortByAdded});
    }
    
    beforeTileMove(tileElt) {
        hidePegCount();
    }
    
    afterTileMove(tileElt) {
        const count = this.getCount();
        const pegCountElt = document.getElementById('pegcount');
        pegCountElt.innerHTML = this.getCount();
        tileElt.appendChild(pegCountElt);
    }
    
    getCount() {
        const tiles = this.getTileElements();
        let count = 0;
        tiles.forEach(t => count += parseInt(t.dataset.countValue));
        return count;
    }
}

function hidePegCount() {
    // Taking the peg count element out of the tile hides it.
    const pegCountElt = document.getElementById('pegcount');
    const gameArea = document.getElementById('tiledisplay');
    gameArea.appendChild(pegCountElt);
}

// Tray sorting. The t1 and t2 arguments are tile HTML elements.
function sortAscending(t1, t2) {
    return t1.dataset.sort - t2.dataset.sort;
}

function sortDescending(t1, t2) {
    return sortAscending(t2, t1);
}

function sortByAdded(t1, t2) {
    return t1.dataset.addedIdx - t2.dataset.addedIdx;
}

const trays = [
    new Tray({baseName: 'deck', sort: sortByAdded}),
    new Tray({baseName: 'turn'}),
    // This is a little awkward. Not sure how to make it better.
    new PeggingTray(),
    new Tray({baseName: 'unplayed', side: 'left', sort: sortAscending, player: 'self'}),
    new Tray({baseName: 'unplayed', side: 'left', player: 'opponent'}),
    new Tray({baseName: 'cribselect', side: 'right', sort: sortDescending, maxTiles: 2}),
    new Tray({baseName: 'crib', sort: sortByAdded}),
    new Tray({baseName: 'played', side: 'right', sort: sortDescending, player: 'self'}),
    new Tray({baseName: 'played', side: 'right', sort: sortDescending, player: 'opponent'}),
    new Tray({baseName: 'cribreveal', side: 'right', sort: sortDescending})
];

function findTray(baseName, player) {
    if (player === 0 || player === 1) {
        player = getPlayerName(player);
    }
    
    const tray = getTray(baseName + '_' + player);
    return tray ? tray : getTray(baseName);
}

function getTray(trayId) {
    return trays.find(t => t.getId() == trayId);
}

function populateDeck() {
    const deckTray = getTray('deck');

    for (let i = 0; i < 13; i++) {
        const tileElement = createBlankTileElement();
        // We want the tiles at the "top" of the deck to have the lowest
        // sort value. That way the opponent's tiles will be dealt in order
        // and the animation will look right.
        tileElement.dataset.sort = 100 - i;
        const tileArea = document.getElementById('tiledisplay');
        tileArea.appendChild(tileElement);
        deckTray.addTile(tileElement);
    }
    deckTray.moveTilesNow();
}

/* ********** Dealing/creating tiles ********** */
function dealTiles(eventTiles) {
    // Tiles come from the server an array of objects with fields
    // id, player, and state.
    if (eventTiles.length !== 6) {
        throw new Error('Need 6 tiles to deal');
    }

    const deckTiles = getTray('deck').getTileElements();
    // Deal this player's tiles.
    eventTiles.forEach((t, i) => dealTile(thisPlayer, t, deckTiles.shift()));
    
    // Then deal 6 blank tiles to the opponent.
    for (let i = 0; i < 6; i++) {
        dealTile(1-thisPlayer, '', deckTiles.shift());
    }
    
    getTray('unplayed_self').moveTilesSequentially(150).then(() => {
        getTray('unplayed_opponent').moveTilesSequentially(150);
    });
}

function dealTile(player, id, tileElement) {
    populateTileElement(player, id, tileElement);
    if (player === thisPlayer) {
        tileElement.addEventListener('click', handleTileClick);
    }
    
    const tray = findTray('unplayed', player);
    tray.addTile(tileElement);
}

function createBlankTileElement() {
    const template = document.querySelector("#tiletemplate");
    return template.content.firstElementChild.cloneNode(true);
}

// TODO: Maybe this doesn't need to be a separate
// function since setTileValues is.
function populateTileElement(player, id, tileElement) {
    const playerName = getPlayerName(player);
    tileElement.dataset.player = playerName;

    const tileSides = tileElement.querySelector('.tilesides');
    tileSides.classList.add('player_' + playerName);
    if (id === '') {
        tileElement.dataset.tile = 'unset';
    } else {
        setTileValues(tileElement, id);
    }
}

function createTileElement(player, id) {
    const tileElement = createBlankTileElement();
    populateTileElement(player, id, tileElement);
    return tileElement;
}

function turn(id) {
    const tile = Tile.fromID(id);
    const deckTiles = getTray('deck').getTileElements();
    if (deckTiles.length !== 1) {
        throw new Error('There should only be one tile left in the deck when the turn happens');
    }
    
    const turnTile = deckTiles[0];
    setTileValues(turnTile, tile);

    const turnTray = getTray('turn');
    turnTray.addTile(turnTile);
    turnTray.moveTilesNow();
}

/* ********* Tile manipulation ********** */
function getTileElt(id, player) {
    elt = document.getElementById(id);
    if (elt) {
        return elt;
    }
}

function getUnsetOpponentTiles(num,fromCrib = false) {
    const tray = fromCrib ? 'crib' : 'unplayed_opponent';
    const selector = `[data-tile='unset'][data-tray='${tray}']`;
    const allTiles = Array.from(document.querySelectorAll(selector));
    return allTiles.slice(-1*num);
}

function setTileValues(tileElement, tile) {
    if (typeof tile === 'string') {
        tile = Tile.fromID(tile);
    }
    
    tileElement.id = tile.getId();
    tileElement.dataset.tile = tile.getId();
    tileElement.dataset.sort = tile.sortValue;
    tileElement.dataset.countValue = tile.getCountValue();
    const tileSides = tileElement.querySelector('.tilesides');
    tileSides.querySelector('.value').innerHTML = tile.getDisplayValue();
    tileSides.classList.add('suit_' + tile.getSuitName());
}

function throwToCrib() {
    // Reverse the order to make the animation better. In the crib selection
    // tray, the tile with the lower index is on the right.
    const selectedTiles = getTray('cribselect').getTileElements().reverse();
    if (selectedTiles.length !== 2) {
        return false;
    }

    document.getElementById('cribarrow').classList.add('hidden');

    const cribTray = getTray('crib');
    selectedTiles.forEach(t => cribTray.addTile(t));
    updateCribArrow();
    cribTray.moveTilesSequentially(100);
    socket.emit('cribselect', selectedTiles.map(t => t.id));
    clickingEnabled = false;
    return true;
}

function opponentThrewToCrib() {
    const tiles = getUnsetOpponentTiles(2);
    const cribTray = getTray('crib');
    tiles.forEach(t => cribTray.addTile(t));
    cribTray.moveTilesSequentially(100);
}

function opponentPegged(id) {
    const tileElt = getUnsetOpponentTiles(1)[0];
    setTileValues(tileElt, id);
    const pegTray = getTray('pegged');
    pegTray.addTile(tileElt);
    pegTray.moveTilesNow();
}

function clearPeggingTray() {
    hidePegCount();
    const elts = getTray('pegged').getTileElements();
    const trays = new Set();
    elts.forEach(function(elt) {
        const newTray = findTray('played', elt.dataset.player);
        trays.add(newTray);
        newTray.addTile(elt);
    });
    
    trays.forEach(t => t.moveTilesNow());
}

function revealCrib(opponentTiles) {
    // Populate the opponent's tiles
    const tiles = getUnsetOpponentTiles(2, true);
    tiles.forEach((t,i) => setTileValues(t, opponentTiles[i]));
    
    // Move all of the tiles in the crib to the reveal tray.
    const crib = getTray('crib').getTileElements();
    const revealTray = getTray('cribreveal');
    crib.forEach(t => revealTray.addTile(t));
    revealTray.moveTilesSequentially(50);
}

function clearTiles() {
    const deckTray = getTray('deck');
    const toClear = ['played_self', 'played_opponent', 'cribreveal'];
    toClear.forEach(function(tray) {
        const trayObj = getTray(tray);
        const tiles = trayObj.getTileElements();
        tiles.reverse();
        tiles.forEach(tile => deckTray.addTile(tile));
    });
    return deckTray.moveTilesSequentially(100).then(resetTiles);
}

function resetTiles() {
    const allTiles = document.querySelectorAll('[data-tray]');
    allTiles.forEach(t => t.remove());
    populateDeck();
    return new Promise(resolve => {
        setTimeout(resolve, 200);
    });
}



/* ********** Link clicking ********** */
class ClickHandler {
    constructor() {
        this.clickMap = {};
    }
    
    isClickingEnabled() {
        return clickingEnabled;
    }
    
    handleTileClick(tileElt) {
        if (this.isClickingEnabled() && this.validate(tileElt)) {
            const curTray = tileElt.dataset.tray;
            const newTrayName = this.clickMap[curTray];
            const newTray = newTrayName ? getTray(newTrayName) : null;
            
            if (newTray && newTray.addTile(tileElt)) {
                newTray.moveTilesNow();
                return true;
            } 
        }
        
        nope(tileElt);
        return false;
    }
    
    validate(tileElt) {
        return true;
    }
}

class CribSelectClickHandler extends ClickHandler {
    constructor() {
        super();
        this.clickMap.cribselect = 'unplayed_self';
        this.clickMap.unplayed_self = 'cribselect';
    }
    
    handleTileClick(tileElt) {
        if (super.handleTileClick(tileElt)) {
            const newTray = tileElt.dataset.tray;
            const delay = newTray === 'cribselect' ? animationTime : 0
            setTimeout(updateCribArrow, delay);
            return true;
        }
        return false;
    }
}

class PeggingClickHandler extends ClickHandler {
    constructor() {
        super();
        this.clickMap.unplayed_self = 'pegged';
    }
    
    getCount() {
        return getTray('pegged').getCount();
    }
    
    isClickingEnabled() {
        if (!super.isClickingEnabled()) {
            return false;
        }
        return gamePhase.data.turn === thisPlayer;
    }
    
    handleTileClick(tileElt) {
        if (super.handleTileClick(tileElt)) {
            // Assume for now that it's the other player's turn,
            // so that an immediate second click will be noped.
            // If it turns out that it's still this player's turn,
            // the response from the server will update the turn data.
            gamePhase.data.turn = 1-thisPlayer;
            socket.emit('peg', [tileElt.id]);
        }
        return true;
    }
    
    validate(tileElt) {
        const tileValue = parseInt(tileElt.dataset.countValue);
        return this.getCount() + tileValue <= 31;
    }
}

const handlers = {
    'cribselect' : new CribSelectClickHandler(),
    'pegging' : new PeggingClickHandler()
}

function handleTileClick(evt) {
    if (!gamePhase) {
        return;
    }
    
    const handler = handlers[gamePhase.name];
    const tileElt = evt.currentTarget;

    if (handler) {
        handler.handleTileClick(tileElt);
    } else {
        nope(tileElt);
    }
}

function nope(tileElt) {
    tileElt.classList.add('nope');
    setTimeout(() => tileElt.classList.remove('nope'), 800);
}


function updateCribArrow() {
    const endSelected = findTray('cribselect').numTiles();
    const arrowElt = document.getElementById('cribarrow');
    if (endSelected === 2) {
        arrowElt.classList.remove('hidden');
    } else {
        arrowElt.classList.add('hidden');
    }
}


/* ********** Scoring ********** */

function createScoreSummary(scoreObj) {
    const summary = document.createElement('div');
    
    const outs = scoreObj.outs;
    
    const summaryTray = document.createElement('div');
    
    summaryTray.classList.add('summarytiles');
    scoreObj.tiles.forEach(function(tile, idx) {
        const tileElt = createBlankTileElement();
        const tileObj = new Tile(tile.suit, tile.runValue);
        setTileValues(tileElt, tileObj);
        if (tile.state === 'turned') {
            tileElt.classList.add('turn');
            if (outs && outs.bingo && outs.bingo.out === outs.out.out) {
                tileElt.classList.add('bingo');
            }
        }
        summaryTray.appendChild(tileElt);
    });
    summary.appendChild(summaryTray);
    
    const scoreTable = document.createElement('table');
    scoreTable.classList.add('scoresummary', 'summary_' + scoreObj.type);
    const headerRow = `<tr><th width="80%" class="summary_name">Total</th><th class="summary_points">${scoreObj.points}</th></tr>`;
    scoreTable.appendChild(htmlToNode(headerRow));
    
    scoreObj.scores.forEach(function(item) {
        const html = `<tr><td class="summary_name">${item.name}</td><td class="summary_points">${item.points}</td></tr>`;
        const scoreRow = htmlToNode(html);
        scoreTable.appendChild(scoreRow);
    });
    summary.appendChild(scoreTable);
    
    if (scoreObj.outs) {
        const outsTable = htmlToNode('<table id="outs" class="scoresummary"></table>');
        const outPoints = outs.out.out;
        const aboveMin = outPoints - outs.min.out;
        const fromMean = outPoints - outs.mean;
        const belowMax = outs.max.out - outPoints;
        outsTable.appendChild(htmlToNode(`<tr><th class="summary_name">Out</th><th class="summary_points">${outPoints}</th></tr>`));
        outsTable.appendChild(htmlToNode(`<tr><td class="summary_name">Above Min</td><td class="summary_points">${aboveMin}</td></tr>`));
        outsTable.appendChild(htmlToNode(`<tr><td class="summary_name">Below Max</td><td class="summary_points">${belowMax}</td></tr>`));
        outsTable.appendChild(htmlToNode(`<tr><td class="summary_name">From Mean</td><td class="summary_points">${fromMean.toFixed(2)}</td></tr>`));
        if (outs.bingo) {
            const bingoTile = Tile.fromID(scoreObj.outs.max.tile);
            const suit = bingoTile.getSuitName();
            const value = bingoTile.getDisplayValue();
            const bingoDiv = `<div class="inline_tile suit_${suit}"><div>${value}</div></div>`;
            const bingoRow = '<tr><td>Bingo</td><td>' + bingoDiv + '</td></tr>';
            outsTable.appendChild(htmlToNode(bingoRow));
        }
        summary.appendChild(outsTable);
    }
    
    return summary;
}

function setScoreButtonState(disabled) {
    const button = document.getElementById('scorebutton');
    button.disabled = disabled;
    if (!disabled) {
        button.addEventListener('mouseover', showPendingScore);
    } else {
        button.removeEventListener('mouseover', showPendingScore);
    }
}

function showPendingScore(evt) {
    showScore('pending');
}

function showScore(id) {
    getScoreById(id, function(score) {
        const summaryDiv = createScoreSummary(score);
        const scoreSummary = document.getElementById('score_summary');
        scoreSummary.innerHTML = '';
        scoreSummary.className = 'rounded';
        scoreSummary.classList.add('showing');
        scoreSummary.appendChild(summaryDiv);
        document.getElementById('overlay').classList.add('showoverlay');
    });
}

function hideOverlay() {
    const panels = ['score_summary', 'scoring_stats'];
    panels.forEach(function(panel) {
        const panelElt = document.getElementById(panel);
        panelElt.innerHTML = '';
        panelElt.className = 'overlayPanel';
    });
    document.getElementById('overlay').classList.remove('showoverlay');
}

function countScore() {
    socket.emit('countScore');
}

function htmlToNode(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstChild;
}

function updateScoreBoard(scoreEventData) {
    const scoreitem = scoreEventData.score;
    const gameScore = scoreEventData.gameScore;
    moveSlider(scoreitem, gameScore);
    updateHistory(scoreitem, gameScore);
}

function updateHistory(scoreitem, gameScore) {
    const player = getPlayerName(scoreitem.player);
    const scoreItemText = `<div class="rounded scoreitem ${player}" data-id="${scoreitem.id}">` +
                          `  <div class="itempoints">${scoreitem.points}</div>` +
                          `  <div class="scoretype">${scoreitem.type}</div>` +
                          `</div>`;
    

    const scoreElt = htmlToNode(scoreItemText);
    scoreElt.addEventListener('mouseenter', function() {
       showScore(scoreitem.id);
    });

    const scoreType = scoreitem.type.toLowerCase();
    // TODO: This array is ugly.
    if (['hand', 'foot', 'crib'].indexOf(scoreType) >= 0) {
        addLinkToCounter(scoreElt, getCounterString(scoreitem.tiles));
    }
    

    const curScoresElt = document.getElementById('currentscores');
    curScoresElt.prepend(scoreElt);
    
    if (scoreType === 'crib') {
        const pastScoresElt = document.createElement('div');
        pastScoresElt.classList.add('pastscores');
        pastScoresElt.append(...curScoresElt.childNodes);
        document.getElementById('history').prepend(pastScoresElt);
        
        // We just finished scoring a hand.
        const selfSummary = document.createElement('span');
        selfSummary.classList.add("scorecheckitem", "self");
        selfSummary.innerHTML = gameScore[thisPlayer].total;
        
        const oppSummary = document.createElement('span');
        oppSummary.classList.add("scorecheckitem", "opponent");
        oppSummary.innerHTML = gameScore[1-thisPlayer].total;
        
        const scorecheck = document.createElement('div');
        scorecheck.classList.add("rounded", "scorecheck");
        scorecheck.appendChild(selfSummary);
        scorecheck.appendChild(oppSummary);
        scorecheck.addEventListener('click', toggleHistory);
        document.getElementById('history').prepend(scorecheck);
    }
}

function moveSlider(scoreitem, gameScore) {
    const pointsScored = scoreitem.points;
    if (pointsScored === 0) {
        return;
    }
    
    // Argh, why did I make this so I have to do toLowerCase()?
    const scoreType = scoreitem.type.toLowerCase();
    const playerString = getPlayerName(scoreitem.player);
    
    // We only need to update the total for the player who scored.
    const scoreData = gameScore[scoreitem.player];
    const newTotal = scoreData.total;
    const newType = scoreData[scoreType];
    let curTotal = newTotal - pointsScored;
    let curType = newType - pointsScored;
    
    const topTotalElt = document.getElementById('slider_score_' + playerString);
    const leftTotalElt = document.getElementById(`score_${playerString}_total`);
    const leftTypeElt = document.getElementById(`score_${playerString}_${scoreType}`);

    // The number should increase when it gets halfway to the next number.
    // So if we're only moving up one point, the transition should happen
    // halfway through the animation. Calculate the delay if the switch
    // happened at the end, then make the first switch only take half that time.
    // The slider uses 1.5 seconds to move.
    const sliderTime = 1500;
    const delay = sliderTime / pointsScored;
    const updateFunc = function() {
        curTotal++;
        curType++;
        topTotalElt.innerHTML = curTotal;
        leftTotalElt.innerHTML = curTotal;
        leftTypeElt.innerHTML = curType;
        if (curTotal < newTotal) {
            setTimeout(updateFunc, delay);
        }
    }
    setTimeout(updateFunc, delay / 2);
    
    // This is total/120 * 100 to get a percentage.
    const pct = '' + (newTotal / 1.2) + '%';
    const topScoreElt = document.getElementById('scoreboard_' + playerString);
    topScoreElt.style.left = pct;    
}

function getScoreById(id, callback) {
    socket.emit('getScore', id, callback);
}

function showScoringStats() {
    socket.emit('scoringStats', null, displayStats);
}

function toggleHistory() {
    document.getElementById('history').classList.toggle('collapsed');
}

/* ********** Other UI Features ********** */

function displayStats(stats) {
    const stats0 = stats[0];
    const stats1 = stats[1];
    if (!stats0.biggest_hand || !stats1.biggest_hand) {
        // We don't have any stats yet. 
        return;
    }
    const statsTable = htmlToNode('<table class="stats_table"></table>');
    statsTable.appendChild(htmlToNode('<tr><th colspan="3">Stats</th></tr>'));
    statsTable.appendChild(makeStatsRow('From Mean', stats0.fromMean.toFixed(2), stats1.fromMean.toFixed(2)));
    statsTable.appendChild(makeStatsRow('Above Min', stats0.aboveMin, stats1.aboveMin));
    statsTable.appendChild(makeStatsRow('Below Max', stats0.belowMax, stats1.belowMax));
    statsTable.appendChild(makeStatsRow('Total Outs', stats0.total, stats1.total));
    
    const handsTable = htmlToNode('<table class="stats_table"></table>');
    handsTable.appendChild(htmlToNode('<tr><th colspan="3">Hands</th></tr>'));
    handsTable.appendChild(makeOutsRow('Biggest', stats0.biggest_hand, stats1.biggest_hand));
    handsTable.appendChild(makeOutsRow('Smallest', stats0.smallest_hand, stats1.smallest_hand));
    
    // TODO: Pass both stats as an array and the property name?
    const outsTable = htmlToNode('<table class="stats_table"></table>');
    outsTable.appendChild(htmlToNode('<tr><th colspan="3">Outs</th></tr>'));
    outsTable.appendChild(makeOutsRow('Best', stats0.best_out, stats1.best_out, true));
    outsTable.appendChild(makeOutsRow('Worst', stats0.worst_out, stats1.worst_out, true));
    outsTable.appendChild(makeOutsRow('Biggest', stats0.biggest_out, stats1.biggest_out));
    outsTable.appendChild(makeOutsRow('Smallest', stats0.smallest_out, stats1.smallest_out));
   
    const statsElt = document.getElementById('scoring_stats');
    statsElt.innerHTML = '';
    statsElt.appendChild(statsTable);
    statsElt.appendChild(handsTable);
    statsElt.appendChild(outsTable);
    statsElt.className = 'rounded';
    statsElt.classList.add('showing');
    document.getElementById('overlay').classList.add('showoverlay');
}

function makeStatsRow(label, stat0, stat1) {
    return htmlToNode(`<tr><td class="stats_label">${label}</td><td>${stat0}</td><td>${stat1}</td></tr>`);
}

function makeOutsRow(label, out0, out1, round) {
    const row = htmlToNode('<tr></tr>');
    row.appendChild(htmlToNode(`<td class="stats_label">${label}</td>`));
    const value0 = round ? out0.value.toFixed(2) : out0.value;
    const value1 = round ? out1.value.toFixed(2) : out1.value;
//    const tileElts0 = createStatTiles(out0.tiles);
//    const tileElts1 = createStatTiles(out1.tiles);
//    const cell0 = htmlToNode(`<td><div>${value0}</div><div class="outstiles">${tileElts0}</div></td>`);
//    const cell1 = htmlToNode(`<td><div>${value1}</div><div class="outstiles">${tileElts1}</div></td>`);

    const cell0 = htmlToNode(`<td class="stat_cell">${value0}</td>`);
    const cell1 = htmlToNode(`<td class="stat_cell">${value1}</td>`);
    
    cell0.addEventListener('mouseenter', function(evt) {
        showScore(out0.id);
    });
    cell1.addEventListener('mouseenter', function(evt) {
        showScore(out1.id);
    });
    addLinkToCounter(cell0, getCounterString(out0.tiles));
    addLinkToCounter(cell1, getCounterString(out1.tiles));
    row.appendChild(cell0);
    row.appendChild(cell1);
    return row;
}

function createStatTiles(tiles) {
    let html = '';
    for (let tile of tiles) {
        const tileObj = Tile.fromID(tile);
        const suit = tileObj.getSuitName();
        const value = tileObj.getDisplayValue();
        html += `<div class="tiny_tile suit_${suit}"><div>${value}</div></div>`;
    }
    return html;
}

// TODO: Can the link specify whether to count as the crib?
// I'm not sure that counter.html supports this.
function addLinkToCounter(elt, tileString) {
    elt.dataset.tiles = tileString;
    elt.addEventListener('click', function(evt) {
        const url = 'https://ckollett.github.io/counter.html#' + evt.currentTarget.dataset.tiles;
        window.open(url);
    });
}