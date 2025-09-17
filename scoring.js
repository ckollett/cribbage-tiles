var t = require("./tiles");

module.exports = {
    scoreHand: scoreHand,
    scorePeggingTiles: scorePeggingTiles,
    scoreTurn: scoreTurn,
    go: function(count) {
        if (count === 31) {
            return new ThirtyOne();
        } else {
            return new Go();
        }
    },
    
    outs: function(tiles) {
        return new Outs(tiles);
    }
};

/* ********** Scoring functions ********** */
function scoreHand(tiles, isCrib) {
    let hand = "";
    tiles.forEach(t => hand += t.getId());
    let scores = scoreValues(tiles.map(tile => tile.runValue));
    let flush = findFlush(tiles.map(tile => tile.suit));
    if (flush) {
        scores.push(flush);
    }
    
    if (tiles.length === 5) {
        let nobs = findNobs(tiles);
        if (nobs) {
            scores.push(nobs);
        } 
    }
    
    findAlternateScoreNames(scores, tiles, isCrib);
    findNonScoringRows(scores, tiles, isCrib);
    
    scores.sort((a,b) => b.priority - a.priority);
    return scores;
}


function findAlternateScoreNames(scores, tiles, isCrib) {
    // Special names when the only scoring is a single pair.
    // if (scores.length === 1) {
        // let score = scores[0];
        // if (score.constructor.name === 'Tuple' && score.count === 2) {
            // Get the pair from the hand. Need to use == instead of === here for
            // reasons I don't understand.
            // let pair = tiles.filter(a => a.value == score.value);
            // scores[0] = new CustomNameScorable(getSinglePairName(pair, isCrib), 2);
        // }
    // }
    
}

// function getSinglePairName(pair, isCrib) {
    // if (isCrib) {
        // if (pair[0].isDealerTile && pair[1].isDealerTile) {
            // return 'Album Title';
        // } else if (!pair[0].isDealerTile && pair[1].isDealerTile) {
            // return 'B-Side';
        // }
    // }
    // return 'Like a Nanny?';
// }

function findNonScoringRows(scores, tiles, isCrib) {
    if (tiles.length === 5) {
        wrongJacks = findWrongJacks(tiles);
        if (wrongJacks) {
            scores.push(wrongJacks);
        }
    }

    let sd = findSuitDiversity(tiles);
    if (sd) {
        scores.push(sd);
    }
}

function scoreValues(values, countOnly) {
    values.sort((a,b) => a-b);
    
    let allComponents = [];
    let tuples = findTuples(values);
    tuples.sort((a,b) => b.count - a.count);
    allComponents = allComponents.concat(tuples);
    
    let scoringGroups = findRunsAndFifteens(values);
    allComponents = allComponents.concat(scoringGroups);
    
    // After creating the tupled groups we should be able to count the same score
    // after each step.
    let scores = {};
    scores.simpleCount = countTuplesAndGroups(tuples, scoringGroups);
    
    let tupledGroups = findTupledGroups(tuples, scoringGroups);
    allComponents = allComponents.concat(tupledGroups);
    
    let things = findThings(tuples, tupledGroups);
    allComponents = allComponents.concat(things);
    let merged = attemptMerge(things, tupledGroups.filter(tg => !tg.consumed));
    if (merged) {
        allComponents.push(merged);
    }
    
    // Once all components are merged we can use the count function,
    // since all of the minus-a-pair situations from things are resolved.
    scores.afterMerge = count(allComponents);
    scores.afterMergeFormula = countByFormula(allComponents);
    
    allComponents = allComponents.filter(item => !item.consumed);
    
    return allComponents;
}

function countTuplesAndGroups(tuples, groups) {
    let score = 0;
    for (let tuple of tuples) {
        score += tuple.getScore();
    }
    
    for (let group of groups) {
        score += group.getScore() * group.getTotalTupleCount(tuples);
    }
    return score;
}

function count(resolvedComponents) {
    let toScore = resolvedComponents.filter(comp => !comp.consumed);
    let score = 0;
    toScore.forEach(comp => score += comp.getScore());
    return score;
}

function countByFormula(allComponents) {
    let toScore = allComponents.filter(comp => !comp.consumed);
    let score = 0;
    toScore.forEach(comp => score += eval(comp.getFormula()));
    return score;
}

function attemptMerge(things, unusedTupleGroups) {
    // TODO: These should be validated. 
    // For compound thing, check that the scoring groups actually match.
    // For partial, check that the unused tuple is actually in the thing correctly.
    if (things.length > 1) {
        // This is something like 4,4,5,6,6 - the same run/15 is a thing 
        // using both the 4 and the 6.
        return new CompoundThing(things);
    } else if (things.length === 1 && unusedTupleGroups.length === 1) {
        return new PartialCompoundThing(things[0], unusedTupleGroups[0]);
    } else if (things.length === 0 && unusedTupleGroups.length > 1) {
        let unique = new Set();
        unusedTupleGroups.forEach(group => unique.add(group.scoringGroup));
        if (unique.size === 1) {
            // This is a double-double or triple-double-double
            // For example 7,7,8,8,2 or 7,7,7,8,8
            return new CompoundTupledGroup(unusedTupleGroups);
        }
    } else {
        return null;
    }
}

function findTuples(values) {
    let unique = new Set();
    values.forEach(value => unique.add(value));
    
    let tuples = [];
    for (let u of unique) {
        let matches = values.filter(a => a === u);
        if (matches.length > 1) {
            tuples.push(new Tuple(u, matches.length));
        }
    }
    return tuples;
}

function findRunsAndFifteens(values) {
    let results = findFifteens(values);
    let run = findRun(values);
    if (run) {
        results.push(run);
    }    
    return results;
}

function findFifteens(values) {
    let fifteens = [];
    let combos = findCombinationsTotaling(values.slice(), 15);
    for (let combo of combos) {
        fifteens.push(new ScoringGroup(combo, false));
    }
    return fifteens;
}

function findCombinationsTotaling(values, total) {
    let known = new Set();
    let combos = [];
    while (values.length > 0) {
        let tile = values.shift();
        value = Math.min(tile, 10);
        if (value === total) {
            combos.push([tile]);
        } else if (value < total) {
            subCombos = findCombinationsTotaling(values.slice(), total-value);
            for (let subCombo of subCombos) {
                const newValue = [tile].concat(subCombo);
                const newStr = JSON.stringify(newValue);
                if (!known.has(newStr)) {
                    combos.push(newValue);
                    known.add(newStr);
                }
            }
        }
    }
    return combos;
}

function findRun(values) {
    let run = [];
    for (let value of values) {
        if (run.length === 0 || value === run[run.length-1] + 1) {
            run.push(value);
        } else if (value === run[run.length-1]) {
            // continue on...
        } else if (run.length >= 3) {
            return new ScoringGroup(run, true);
        } else {
            run = [value];
        }
    }
    return run.length >= 3 ? new ScoringGroup(run, true) : null;
}

function findTupledGroups(tuples, groups) {
    let tupledGroups = [];
    for (let tuple of tuples) {
        for (let group of groups) {
            tupleCount = group.getTupleCount(tuple);
            if (tupleCount > 1) {
                tupledGroups.push(new TupledGroup(tuple, group));
            }
        }
    }
    return tupledGroups;
}

function findThings(tuples, tupledGroups) {
    let things = [];
    for (let tuple of tuples) {
        let groups = tupledGroups.filter(tg => tg.tuple.value === tuple.value);
        if (groups.length > 1) {
            things.push(new Thing(tuple, groups));
        }
    }
    return things;
}

function choose(n, k) {
    if (k === 0 || n === 0) return 1;
    return (n * choose(n - 1, k - 1)) / k;
}

function findFlush(suits) {
    for (let suit of suits) {
        let numInSuit = suits.filter(s => s === suit).length;
        if (numInSuit >= 4) {
            return new Flush(suit, numInSuit);
        }
    }
    
    return null;
}

function findNobs(hand) {
    let handCopy = hand.slice();
    let turnSuit = handCopy.pop().suit;
    let nobsTiles = handCopy.filter(tile => tile.suit === turnSuit && tile.runValue === 11);
    return nobsTiles.length === 1 ? new ScoringJack(turnSuit, 1) : null;
}

function findWrongJacks(hand) {
    let handOnly = hand.slice();
    let turn = handOnly.pop();
    if (turn.value === 'J') {
        // No wrong Jacks when the turn is a Jack
        return null;
    }
    let jacks = handOnly.filter(a => a.value === 'J');
    let matchingJack = jacks.filter(a => a.suit === turn.suit);
    return (matchingJack.length === 0 && jacks.length > 1) ? new WrongJacks(jacks.length) : null;
}

function findSuitDiversity(hand) {
    let suits = new Set();
    for (let i = 0; i < 4; i++) {
        suits.add(hand[i].suit);
    }
    return suits.size === 4 ? new SuitDiversity() : null;
}

/* ********** Scoring Objects ********** */
class Displayable {
    constructor() {
        this.priority = 0;
    }
    
    getName() {
        return "";
    }
    
    getFormula() {
        return "";
    }
    
    getScore() {
        return 0;
    }
}

class Scorable extends Displayable {
    constructor() {
        super();
        this.consumed = false;
    }
        
    getMultiplier() {
        let multiplier = 1;
        this.getOutsideParens().forEach(m => multiplier *= m);
        return multiplier;
    }
    
    getScore() {
        return 0;
    }
}

// A tuple is a repeated tile value within a hand
class Tuple extends Scorable {
    constructor(value, count) {
        super();
        this.value = value;
        this.count = count;
        this.priority = 1;
    }
    
    getName() {
        let name = "";
        switch (this.count) {
            case 2 : name = "Pair of "; break;
            case 3 : name = "Pair Royal of "; break;
            case 4 : name = "Double Pair Royal of "; break;
        }
        return name + this.getDisplayValue() + 's';
    }
        
    getScore() {
        // (count choose 2) * 2 = count * (count-1)
        return this.count * (this.count-1);
    }
    
    getDisplayValue() {
        switch (this.value) {
            case 11 : return 'Jack';
            case 12 : return 'Queen';
            case 13 : return 'King';
            default : return this.value;
        }
    }
}

class CustomNameScorable extends Displayable {
    constructor(name, score) {
        super();
        this.name = name;
        this.score = score;
    }
    
    getName() {
        return this.name;
    }
    
    getScore() {
        return this.score;
    }
}

// A scoring group is just a run or a fifteen
class ScoringGroup extends Scorable {
    constructor(values, isRun) {
        super();
        this.values = values;
        this.isRun = isRun;
        this.priority = 2;
    }
    
    getName() {
        let name = this.isRun ? "Run of " : "Fifteen-";
        name += this.values.length;
        return name;
    }

    getTotalTupleCount(tuples) {
        let total = 1;
        for (let tuple of tuples) {
            total *= this.getTupleCount(tuple);
        }
        return total;
    }

    getTupleCount(tuple) {
        let numUsed = this.values.filter(value => value === tuple.value).length
        return numUsed > 0 ? choose(tuple.count, numUsed) : 1;
    }
    
    getScore() {
        // Atomic!
        return this.values.length;
    }
    
    equals(otherGroup) {
        return otherGroup.values === this.values && otherGroup.isRun === this.isRun;
    }
}

// A tupled group is a scoring group that is counted
// multiple times because of a tuple.
class TupledGroup extends Scorable {
    constructor(tuple, scoringGroup) {
        super();
        this.tuple = tuple;
        this.scoringGroup = scoringGroup;
        tuple.consumed = true;
        scoringGroup.consumed = true;
        this.priority = 3;
    }
    
    getName() {
        return this.getTupleName() + this.scoringGroup.getName();
    }
    
    getTupleName() {
        return getTupleName(this.getTupleCount());
    }
    
    getFormula() {
        let numTupleInGroup = this.scoringGroup.values.filter(v => v === this.tuple.value).length;
        let score1 = '' + choose(this.tuple.count,numTupleInGroup) + ' * ' + this.scoringGroup.values.length;
        let score2 = '' + choose(this.tuple.count,2) + ' * 2';
        return score1 + ' + ' + score2;
    }
    
    getTupleCount() {
        return this.scoringGroup.getTupleCount(this.tuple);
    }
    
    getScore() {
        // 1,2,2,3 should be 3*2 + 2
        // 1,2,2,2,3 should be 3*3 + 6
        // 4,4,4,4,7 should be 3*6 + 12
        return this.scoringGroup.getScore() * this.getTupleCount() + this.tuple.getScore();
    }
}

function getTupleName(count) {
    switch(count) {
        case 2 : return "Double ";
        case 3 : return "Triple ";
        case 4 : return "Quadruple ";
        case 6 : return "Sextuple ";
    }    
}

class CompoundTupledGroup extends Scorable {
    constructor(tupledGroups) {
        super();
        tupledGroups.forEach(group => group.consumed = true);
        this.scoringGroup = tupledGroups[0].scoringGroup;
        this.tuples = tupledGroups.map(group => group.tuple);
        this.priority = 4;
    }
    
    getName() {
        let name = "";
        for (let tuple of this.tuples) {
            name += getTupleName(tuple.count);
        }
        name += this.scoringGroup.getName();
        return name;
    }
    
    getFormula() {
        let part1 = '';
        let part2 = ''
        for (let tuple of this.tuples) {
            part1 += tuple.count + ' * ';
            part2 += ' + ' + tuple.getScore();
        }
        return part1 + this.scoringGroup.getScore() + part2;
    }
    
    getScore() {
        let multiplier = 1;
        this.tuples.forEach(tuple => multiplier *= tuple.count);
        let score = multiplier * this.scoringGroup.getScore();
        for (let tuple of this.tuples) {
            score += tuple.getScore();
        }
        return score;
    }
    
}

// A thing happens when there are multiple tupled groups
// for the same tuple.
class Thing extends Scorable {
    constructor(tuple, tupledGroups) {
        super();
        this.tuple = tuple;
        this.tupledGroups = tupledGroups;
        this.groups = tupledGroups.map(tupledGroup => tupledGroup.scoringGroup);
        this.groups.sort((a,b) => b.values.length - a.values.length);
        tupledGroups.forEach(tg => tg.consumed = true);
        this.priority = 5;
    }
    
    getName() {
        let name = "(";
        for (let i = 0; i < this.groups.length; i++) {
            if (i > 0) name += ",";
            name += this.groups[i].values.length;
        }
        name += ") ";
        switch (this.tuple.count) {
            case 3 : name += "Royal "; break;
            case 4 : name += "Four-"; break;
        }
        name += "Thing";
        return name;
    }
        
    getScore() {
        let score = 0;
        // Need tupled groups for this!
        this.tupledGroups.forEach(tg => score += (tg.getTupleCount() * tg.scoringGroup.getScore()));
        score += this.tuple.getScore();
        return score;
    }
}

class CompoundThing extends Scorable {
    constructor(components) {
        super();
        this.components = components;
        this.components.sort((a,b) => a.tuple.count - b.tuple.count);
        components.forEach(c => c.consumed = true);
        this.priority = 6;
    }
    
    getName() {
        let name = "(";
        for (let i = 0; i < this.components[0].groups.length; i++) {
            if (i > 0) name += ",";
            name += this.components[0].groups[i].values.length;
        }
        name += ") Double Thing";
        return name;
    }
        
    getScore() {
        let score = 0;
        this.components.forEach(comp => score += comp.getScore());
        return score;
    }
}

class PartialCompoundThing extends Scorable {
    constructor(thing, tupledGroup) {
        super();
        this.thing = thing;
        this.tupledGroup = tupledGroup;
        thing.consumed = true;
        tupledGroup.consumed = true;
        this.priority = 6;
        
        // One of the scoring groups in the thing will be doubled, the other undoubled.
        for (let thingGroup of thing.tupledGroups) {
            if (thingGroup.scoringGroup.equals(tupledGroup.scoringGroup)) {
                this.doubled = tupledGroup.scoringGroup.values.length;
            } else {
                this.undoubled = thingGroup.scoringGroup.values.length;
            }
        }
    }
    
    getName() {
        return "(Double " + this.doubled + "," + this.undoubled + ") Thing";
    }
    
    getScore() {
        return this.thing.getScore() + this.tupledGroup.getScore();
    }
}

class Flush extends Scorable {
    constructor(suit, num) {
        super();
        this.suit = suit;
        this.num = num;
    }
    
    getScore() {
        return this.num;
    }
    
    getName() {
        switch (this.suit) {
            case "c" : return "Bonfire";
            case "t" : return "Group site";
            case "s" : return "Slumber party";
            case "m" : return "Coffee shop";
        }
    }
}

function scoreTurn(tile) {
    if (tile.runValue === 11) {
        return [new ScoringJack(tile.suit, 2)];
    }
    return [];
}

class ScoringJack extends Scorable {
    constructor(suit, points) {
        super();
        this.suit = suit;
        this.points = points;
    }
    
    getScore() {
        return this.points;
    }
    
    getName() {
        switch (this.suit) {
            case "m" : return "Joe";
            case "c" : return "James";
            case "s" : return "Slumberjack";
            case "t" : return "Jack of Tents";
        }
    }
}

class WrongJacks extends Displayable {
    constructor(numWrongJacks) {
        super();
        this.numWrongJacks = numWrongJacks;
    }
    
    getName() {
        if (this.numWrongJacks === 3) {
            return "All the Wrong Jacks";
        } else {
            return "" + this.numWrongJacks + " Wrong Jacks";
        }
    }
}

class SuitDiversity extends Displayable {
    getName() {
        return "Suit Diversity";
    }
}

class TotalScore extends Displayable {
    constructor(scoreParts) {
        super();
        this.total = scoreParts.reduce((sum, next) => sum + next.getScore(), 0);
    }
    
    getName() {
        return "Total";
    }
    
    getScore() {
        return this.total;
    }
}

class OutScore extends Displayable {
    constructor(out, name) {
        super();
        this.out = out;
        this.name = name;
    }
    
    getName() {
        return this.name;
    }
    
    getScore() {
        return Math.round(this.out * 100)/100;
    }
}


/* ************ Pegging **************** */
class ThirtyOne extends Displayable {
    getName() {
        return "31";
    }
    
    getFormula() {
        return "2";
    }
    
    getScore() {
        return 2;
    }    
}

class Go extends Displayable {
    getName() {
        return "Go";
    }
    
    getFormula() {
        return "1";
    }
    
    getScore() {
        return 1;
    }    
}

function scorePeggingTiles(tiles) {
    return scorePeggingValues(tiles.map(tile => tile.runValue));
}

function scorePeggingValues(values) {
    let scoreParts = [];

    // For runs, go forward to find the biggest possible run...
    for (let i = 0; i < values.length-2; i++) {
        let possibleRun = values.slice(i);
        if (isPeggingRun(possibleRun)) {
            scoreParts.push(new ScoringGroup(possibleRun, true));
            break;
        }
    }

    // Only check for tuples if it's not a run.
    if (scoreParts.length === 0) {
        let tupleSize = 1;
        let lastValue = values[values.length-1];
        for (let i = values.length-2; i >= 0; i--) {
            if (values[i] === lastValue) {
                tupleSize++;
            } else {
                break;
            }
        }
        if (tupleSize > 1) {
            scoreParts.push(new Tuple(lastValue, tupleSize));
        }
    }
    
    // Now check for  fifteens.
    let sumReducer = function(total, value) {
        return total + Math.min(value, 10);
    }
    let total = values.reduce(sumReducer, 0);
    if (total === 15) {
        scoreParts.push(new ScoringGroup(values, false));
    }
    
    return scoreParts;    
}

function isPeggingRun(values) {
    let max = 0;
    let min = 14;
    let valueSet = new Set();
    for (let value of values) {
        valueSet.add(value);
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    return valueSet.size === values.length && max-min === values.length-1;
}

/* ***** Outs ***** */
/* TODO: The best/worst, etc. methods should return the tile and the points */
class Outs {
    constructor(tiles) {
        tiles = tiles.slice();
        const outs = [];
        let turn;
        if (tiles.length == 5) {
            turn = tiles.pop();
            this.turn = turn.getId();
        }
        this.tiles = t.tilesToIds(tiles);
        
        const scoreParts = scoreHand(tiles);
        this.baseScore = new TotalScore(scoreParts).getScore();

        let total = 0;
        const suits = ['c','m','s','t'];
        for (var i = 1; i <= 13; i++) {
            for (let suit of suits) {
                const tile = t.newTile(suit, i);
                if (!tiles.find(t => t.getId() === tile.getId())) {
                    tiles.push(tile);
                    const scoreParts = scoreHand(tiles);
                    const score = new TotalScore(scoreParts).getScore();
                    tiles.pop();
                    
                    const out = {
                        tile: tile.getId(), 
                        handScore: score,
                        out: score - this.baseScore
                    };
                    outs.push(out);
                    total += out.out;
                    
                    if (turn && tile.getId() === turn.getId()) {
                        this.out = out;
                    }
                }
            }
        }
        
        outs.sort((out1, out2) => out1.out - out2.out);
        const num = outs.length;
        
        this.mean = total / num;
        this.max = outs[num-1];
        this.min = outs[0];
        this.bingo = outs[num-1].out > outs[num-2].out ? outs[num-1] : null;
    }
    
    fromMean() {
        return this.out.out - this.mean;
    }
    
    aboveMin() {
        return this.out.out - this.min.out;
    }
    
    belowMax() {
        return this.max.out - this.out.out;
    }
}