const t = require("./tiles");
const s = require("./scoring");
const winScore = 121;
let game;
let listener;

// TODO: Can we export just registerListener
// and newGame? Maybe even just newGame? Maybe
// it's better if this file holds the instance
// of game, though, rather than server.js.
module.exports = {
    registerListener: function(newListener) {
        listener = newListener;
    },
    
    newGame: function() {
        game = new Game();
        return game;
    },
    
    deal: function(player) {
        game.nextDeal(player);
    },
    
    handleTileEvent: handleTileEvent,
    
    getPendingScore: function() {
        const phase = game.currentDeal().phase;
        return phase.pendingScore ? phase.pendingScore : [];
    },
    
    getScoreById: function(id) {
        return game.getScoreById(id);
    },
    
    countScore: function() {
        game.currentDeal().countPendingScore();
    },
    
    getScoringStats: function() {
        return game.getScoringStats();
    },
    
    getFullGame: function() {
        return game.fullGame();
    }
};

function handleTileEvent(player, ids) {
    const deal = game.currentDeal();
    if (deal.phase.pendingScore) {
        throw new Error('Cannot play tiles while score is pending!');
    }
    
    const tiles = deal.resolveTiles(ids);
    deal.phase.handleTilesEvent(player, tiles);
}

/* ********** Game class ********** */
class Game {
    deals = [];
    #scores = [];
    
    nextDeal(dealer) {
        const currentScore = this.currentScore();
        this.deals.push(new Deal(dealer, currentScore));

        for (let i = 0; i < 2; i++) {
            const playerTiles = this.currentDeal().getTiles({player: i});
            const evt = new DealEvent(playerTiles, dealer);
            evt.send(i);
        }
    }

    currentDeal() {
        return this.deals[this.deals.length-1];
    }
    
    // TODO: If we keep track of the pending
    // score here, too, we can set its ID while
    // it is still pending.
    addScore(score) {
        score.id = this.#scores.length;
        this.#scores.push(score);
        return score.id;
    }
    
    getScoreById(id) {
        return this.#scores[id];
    }
    
    currentScore() {
        const scores = [];
        for (let i = 0; i < 2; i++) {
            scores.push({
                total:0,
                nobs:0,
                peg:0,
                hand:0,
                foot:0,
                crib:0
            });
        }
        
        this.#scores.forEach(function(s) {
            const playerScores = scores[s.player];
            const points = Math.min(s.points, winScore - playerScores.total);
            playerScores.total += points;
            
            const type = s.type.toLowerCase();
            playerScores[type] += points;
        });
        return scores;
    }
    
    getScoringStats() {
        const stats = [new ScoringStats(), new ScoringStats()];
        const scoresWithOuts = this.#scores.filter(s => s.outs);
        scoresWithOuts.forEach(function(s) {
            stats[s.player].addOuts(s);
        });
        return stats;
    }
    
    fullGame() {
        const deals = [];
        for (let deal of this.deals) {
            const tiles = deal.getTiles({});
            deals.push(tiles);
        }
        return deals;
    }
}

class ScoringStats {
    #num = 0;
    aboveMin = 0;
    belowMax = 0;
    fromMean = 0;
    total = 0;
    
    addOuts(score) {
        const outs = score.outs;
        this.aboveMin += outs.aboveMin();
        this.belowMax += outs.belowMax();
        this.fromMean += outs.fromMean();
        this.total += outs.out.out;
        
        const outFunc = outs => score.outs.out.out;
        const fromMeanFunc = outs => score.outs.fromMean();
        
        this.updateStat('biggest_out', score, outFunc);
        this.updateStat('smallest_out', score, outFunc, true);
        this.updateStat('best_out', score, fromMeanFunc);
        this.updateStat('worst_out', score, fromMeanFunc, true);
        
        const handScoreFunc = score => score.points;
        this.updateStat('biggest_hand', score, handScoreFunc);
        this.updateStat('smallest_hand', score, handScoreFunc, true);
        
        this.#num++;
        this.mean = this.total / this.#num;
        console.log('New mean: ' + this.mean);
    }
    
    updateStat(statName, score, valueFunc, smallest) {
        const current = this[statName];
        const newValue = valueFunc(score);
        let update = !current;
        if (current) {
            update = smallest ? newValue < current.value : newValue > current.value; 
        }
        if (update) {
            const allTiles = score.tiles.slice();
            this[statName] = {
                id: score.id,
                tiles: allTiles,
                value: newValue
            };
        }
            
    }
}

/* ********** Deal class ********** */
class Deal {
    #tiles;
    
    constructor(dealer, startingScore = [0, 0]) {
        this.dealer = dealer;
        this.startingScore = startingScore;
        
        // Deal the tiles.
        const tiles = getShuffledDeck().slice(0, 13);
        for (let i = 0; i < 6; i++) {
            tiles[i].player = 0;
            tiles[i].state = 'unplayed';
        }
        for (let i = 6; i < 12; i++) {
            tiles[i].player = 1;
            tiles[i].state = 'unplayed';
        }
        
        tiles[12].tray = 'deck';
        tiles[12].state = 'unturned';
        this.#tiles = tiles;

        this.phase = new SelectCribPhase(this);
    }
    
    getTiles({player = -1, state = ''}) {
        let tiles = this.#tiles;
        if (player !== -1) {
            tiles = tiles.filter(t => t.player === player);
            tiles.sort((a,b) => a.compareTo(b))         
        }
        if (state != '') {
            tiles = tiles.filter(t => t.state === state);
        }
        return tiles;
    }
    
    getTurn() {
        return this.#tiles.at(-1);
    }

    getTileById(id) {
        return this.#tiles.find(tile => tile.getId() === id);
    }
    
    // Get tiles from this deal out of the deck. 
    // If the input is an array, returns an array.
    // If the input is scalar, returns a scalar.
    resolveTiles(ids) {
        if (Array.isArray(ids)) {
            return ids.map(entry => this.resolveTiles(entry));
        }
    
        return this.getTileById(ids);
    }
    
    countPendingScore() {
        const score = this.phase.pendingScore;
        if (!score) {
            throw new Error('No pending score to count');
        }
        game.addScore(score);
        delete(this.phase.pendingScore);
        
        // If it's game over I think we can bail
        // out immediately.
        if (!this.checkGameOver()) {
            this.phase.handleScore();
        }
        new SendScoreEvent(score).send();
    }
    
    checkGameOver() {
        const score = game.currentScore();
        const winner = score.findIndex(s => s.total === winScore);
        if (winner >= 0) {
            this.phase = new GameOver(this, winner);
            return true;
        }
        return false;
    }
}

function getShuffledDeck() {
    // Create all of the tiles.
    const tiles = [];

    if (false) {
        createTestDeal(tiles);
        return tiles;
    }

    // Suits are campfire, mug, sleeping bag, tent
    const suits = ['c', 'm', 's', 't'];
    for (let suit of suits) {
        for (let i = 1; i <= 13; i++) {
            tiles.push(t.newTile(suit, i));
        }
    }
  
    // Shuffle the tiles
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return tiles;
}

function createTestDeal(tiles) {
    tiles.push(t.newTile('c', 5));
    tiles.push(t.newTile('m', 5));
    tiles.push(t.newTile('s', 5));
    tiles.push(t.newTile('t', 11));
    
    for (let i = 1; i <= 4; i++) {
        tiles.push(t.newTile('t', i));
        tiles.push(t.newTile('m', i));
    }
    
    tiles.push(t.newTile('t', 5));
}

/* ********** Score class ********** */
class Score {
    constructor(player, type, tiles, scores, outs) {
        this.player = player;
        this.type = type;
        this.tiles = tiles.slice();
        this.scores = scores.map(function(scorePart) {
            return {
                'points' : scorePart.getScore(),
                'name' : scorePart.getName()
            };
        });
        
        const points = this.scores.reduce((sum, next) => sum + next.points, 0);
        this.points = points;
        this.outs = outs;
    }
}

/* ********** GamePhase abstract class ********** */
class GamePhase {
    constructor(deal) {
        this.deal = deal;
    }
    
    getName() {return ""}
    getProperties() {return {}}
    
    handleTilesEvent(player, tiles) {}
    
    setPendingScore(player, type, tiles, scores, outs) {
        this.pendingScore = new Score(player, type, tiles, scores, outs);
    }
}

/* ********** GamePhase implementations ********** */
class SelectCribPhase extends GamePhase {
    constructor(deal) {
        super(deal);
    }
    
    getName() {
        return 'cribselect';
    }

    getProperties() {
        return {};
    }
    
    handleTilesEvent(player, tiles) {
        if (!tiles || tiles === null) {
            throw new Error('Crib selection event must specify tiles');
        }
        
        this.throwToCrib(tiles);
        let evt = new MoveTilesEvent('cribselect', tiles);
        evt.send([1-player]);
        
        this.checkCribFull();
    }
    
    throwToCrib(tiles) {
        this.validateCribThrow(tiles);
        tiles.forEach(tile => tile.state = 'crib');
    }
    
    validateCribThrow(tiles) {
        if (!tiles || tiles.length === 0) {
            return;
        }
        
        const that = this;
        const player = tiles[0].player;
        
        tiles.forEach(function(tile) {
            if (tile.state !== 'unplayed') {
                throw new Error('Tile [' + tile.getId() + '] has state [' + tile.state + '] and cannot be moved to the crib!');
            }
            
            if (tile.player !== player) {
                throw new Error('Cannot throw tiles from both players in a single crib throw!');
            }
        });
    }
    
    checkCribFull() {
        const crib = this.deal.getTiles({state: 'crib'});
        if (crib.length === 4) {
            // Add the turn to the event and move the state.
            // Since the turn happened and the state changed we need to notify
            // both players.
            const turn = this.deal.getTurn();
            
            // Helpful when making sure that turning a jack works correctly.
            // const turn = t.newTile('m',11);
            turn.state = 'turned';
            
            const newPhase = new PeggingPhase(this.deal);
            const score = s.scoreTurn(turn);
            if (score.length > 0) {
                newPhase.setPendingScore(this.deal.dealer, 'Nobs', [turn], score);
            }
            
            this.deal.phase = newPhase;
            let evt = new MoveTilesEvent('turn', turn);
            evt.send();
        }
    }
    
    handleScore() {
        // Scoring in this state is only possible when a Jack is turned,
        // so after scoring the next state will always be pegging.
        this.deal.phase = new PeggingPhase(this.deal);
    }
}

class PeggingPhase extends GamePhase {
    constructor(deal) {
        super(deal);
        this.currentTurn = 1-deal.dealer;
        this.peggedTiles = [];
        this.numPlayed = 0;
        this.go = false;
    }
    
    getName() {
        return 'pegging';
    }

    getProperties() {
        return {
            "turn" : this.currentTurn,
            "count" : this.getCount(),
            "go" : this.go
        }
    }
    
    handleTilesEvent(player, tiles) {
        const tile = this.validatePeggingEvent(player, tiles);
        const deal = this.deal;
        this.numPlayed++;
        
        this.peggedTiles.push(tile);
        tile.state = 'pegged';
        tile.pegIdx = this.numPlayed;
        const score = s.scorePeggingTiles(this.peggedTiles);

        // Start by assuming that neither player is at go (or bummer).
        this.go = false;
        if (this.checkForGo(1-player)) {
            // We need to display the go indicator if the other player can no longer play.
            this.go = true;
            if (this.checkForGo(player)) {
                // It's a go for everyone. 
                score.push(s.go(this.getCount()));
                
                //It's the other player's turn unless they're out of cards.
                const otherPlayerUnplayed = this.deal.getTiles({player: 1-player, state: 'unplayed'});
                if (otherPlayerUnplayed.length > 0) {
                    this.currentTurn = 1-player;
                }
            }
        } else {
            // The other player can still play. Just flip the turn to them.
            this.currentTurn = 1-player;
        }
        
        if (score.length > 0) {
            this.setPendingScore(player, 'Peg', this.peggedTiles, score);
            tile.pegScore = this.pendingScore.points;
        }
        
        // Notify the other player
        new MoveTilesEvent('peg', tile).send(1-player);
        
        // Also notify the current player, in case:
        // * It is still their turn
        // * They scored
        new MoveTilesEvent('peg', []).send(player);
    }
    
    validatePeggingEvent(player, tiles) {
        if (player != this.currentTurn) {
            throw new Error('It is not player [' + player + ']\'s turn to peg!');
        }
        if (tiles.length !== 1) {
            throw new Error('Players can only peg one tile at a time!');
        }
        
        const peggedTile = tiles[0];
        if (peggedTile.player != player) {
            throw new Error('Player [' + player + '] cannot peg a tile that was dealt to player [' + (1-player) + ']!');
        }
        if (peggedTile.getCountValue() + this.getCount() > 31) {
            throw new Error('Pegging a tile with value [' + peggedTile.getCountValue() + '] exceeds the maximum pegging value of 31!');
        }
        return peggedTile;
    }
    
    getCount() {
        const sumReducer = function(total, tile) {
            return total + tile.getCountValue();
        }
        return this.peggedTiles.reduce(sumReducer, 0);
    }
    
    checkForGo(player) {
        const unplayed = this.deal.getTiles({player: player, state: 'unplayed'});
        // The unplayed tiles will be sorted, so we only have to check if the
        // first (smallest) one can be played to see if it's go.
        return (unplayed.length === 0 || unplayed[0].getCountValue() + this.getCount() > 31);
    }
    
    handleScore() {
        // If we just scored a Go, clear the tray.
        if (this.checkForGo(0) && this.checkForGo(1)) {
            this.clearTray();
            this.go = false;
        }
        
        const unplayed = this.deal.getTiles({state: 'unplayed'});
        if (unplayed.length === 0) {
            // We're done pegging. Time to count hands.
            const nonDealer = 1 - this.deal.dealer;
            this.deal.phase = new CountHandPhase(this.deal, nonDealer);
        }
    }
    
    clearTray() {
        const pegged = this.peggedTiles;
        pegged.forEach(t => t.state = 'played');
        this.peggedTiles = [];
        new MoveTilesEvent('clearPeg', []).send();
    }
}

class CountHandPhase extends GamePhase {
    constructor(deal, player, isCrib = false) {
        super(deal);
        this.player = player;
        this.isCrib = isCrib;
        let type;
        if (isCrib) {
            const crib = this.deal.getTiles({state: 'crib'});
            for (let i = 0; i < 2; i++) {
                const otherPlayer = crib.filter(t => t.player !== i);
                new MoveTilesEvent('cribreveal', otherPlayer).send(i);
            }
            type = 'Crib';
        } else {
            type = player === deal.dealer ? 'Foot' : 'Hand';
        }

        /* TODO: Should Outs be modified to detect when 5 tiles were
           passed and keep track of the actual turn itself, rather than
           tacking it on later? */
        const tiles = this.getTiles().slice();
        tiles.push(deal.getTurn());
        const outs = s.outs(tiles);
        const score = s.scoreHand(tiles, isCrib);
        
        this.setPendingScore(player, type, tiles, score, outs);
    }
    
    getTiles() {
        if (this.isCrib) {
            return this.deal.getTiles({state: 'crib'});
        } else {
            return this.deal.getTiles({state: 'played', player: this.player});
        }
    }
    
    getName() {
        return 'counthands';
    }
    
    handleTilesEvent(player, tiles) {
        throw new Error('Cannot play tiles while hands are being counted.');
    }
    
    handleScore() {
        let nextPhase;
        if (this.player === this.deal.dealer) {
            if (this.isCrib) {
                game.nextDeal(1-this.player);
                return;
            } else {
                nextPhase = new CountHandPhase(this.deal, this.player, true);
            }
        } else {
            nextPhase = new CountHandPhase(this.deal, 1-this.player, false);
        }
        this.deal.phase = nextPhase;
    }
}

class GameOver extends GamePhase {
    constructor(deal, winner) {
        super(deal);
        this.winner = winner;
    }
    
    getName() {
        return "gameover";
    }
    
    getProperties() {
        return {
            winner: this.winner
        };
    }
    
    handleTilesEvent(player, tiles) {
        throw new Error('Cannot play tiles after game has ended');
    }
    
    handleScore() {}
}

/* ********** EVENTS ********** */
class GameEvent {
    constructor(eventName) {
        this.name = eventName;
    }
    
    getEventData() {
        const phase = game.currentDeal().phase;
        const eventData = {
            name: this.name,
            phase: {
                name: phase.getName(),
                data: phase.getProperties()
            }
        };
        this.addData(eventData);
        return eventData;
    }
    
    addData(data) {}
    
    send(players = [0,1]) {
        if (!Array.isArray(players)) {
            players = [players];
        }
        
        for (let player of players) {
            const evtData = this.getEventData();
            const pendingScore = game.currentDeal().phase.pendingScore;
            if (pendingScore) {
                evtData.pendingScore = pendingScore.player;
            }
            
            listener(player, evtData);
        }
    }
    
}

class MoveTilesEvent extends GameEvent {
    constructor(name, tiles) {
        super(name);
        if (!Array.isArray(tiles)) {
            tiles = [tiles];
        }
        this.tiles = tiles;
    }
    
    addData(data) {
        data.tiles = this.tiles.map(t => t.getId());
    }
}

class DealEvent extends MoveTilesEvent {
    constructor(tiles, dealer) {
        super('deal', tiles);
        this.dealer = dealer;
    }
    
    addData(data) {
        super.addData(data);
        data.dealer = this.dealer;
    }
}

class SendScoreEvent extends GameEvent {
    constructor(score) {
        super('score');
        this.score = score;
    }
    
    addData(data) {
        data.score = this.score;
        data.gameScore = game.currentScore();
    }
}
