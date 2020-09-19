const columnWidth = 14;
const tileWidth = 13;

function renderTile(tile) {
    const container = document.createElement("div");
    container.classList.add("tilecontainer");
    
    const sides = document.createElement("div");
    sides.classList.add("tilesides");
    container.appendChild(sides);
    
    const front = document.createElement("div");
    front.classList.add("tile");
    front.classList.add("tilefront");
    if (tile.suit && tile.suit.length > 0) {
        front.classList.add(tile.suit);
    }
    sides.appendChild(front);
    
    const value = document.createElement("div");
    value.classList.add("value");
    value.innerHTML = tile.num;
    front.appendChild(value);
    
    const back = document.createElement("div");
    back.classList.add("tile");
    back.classList.add("tileback");
    sides.appendChild(back);
    
    container.tile = tile;    
    container.num = tile.num;
    container.suit = tile.suit;
    
    return container;
}

function updateTileElt(tileElt, tile) {
    tileElt.tile = tile;
    tileElt.num = tile.num;
    tileElt.suit = tile.suit;
    
    const front = tileElt.getElementsByClassName("tilefront").item(0);
    front.classList.add(tile.suit);
    
    const value = front.getElementsByClassName("value").item(0);
    value.innerHTML = tile.num;
}

function renderTwoSidedTile() {
    var outerElt = document.createElement("div");
    outerElt.classList.add("flip=outer");
    outerElt.classList.add("tile");
    
    var innerElt = document.createElement("div");
    innerElt.classList.add("flip-inner");
    outerElt.appendChild(innerElt);
    
    var tileElt = document.createElement("div");
    tileElt.classList.add("front");
    innerElt.appendChild(tileElt);
    
    var backElt = document.createElement("div");
    backElt.classList.add("back");
    innerElt.appendChild(backElt);
        
    return outerElt;
}

function addTile(tileElt) {
    document.getElementById('game').appendChild(tileElt);
}

function updateTilePositions(deal) {
    const hand = deal.getTiles('player','hand');
    positionTiles(hand, '0%', false);
    
    const selected = deal.getTiles('player','selected');
    positionTiles(selected, '33%', true);
        
    const oppHand = deal.getTiles('opponent','hand');
    positionTiles(oppHand, '66%', false);
    
    const played = deal.getTiles('player','played');
    positionTiles(played, '0%', true);
    
    const oppPlayed = deal.getTiles('opponent','played');
    positionTiles(oppPlayed, '66%', true);
}

function positionTiles(tiles, top, rightSide) {
    if (rightSide) {
        tiles.reverse();
    }
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].tileElt.style.top = top;
        tiles[i].tileElt.style.left = getLeftValue(i, rightSide);
    }
}

function positionCribTiles(tiles,start) {
    for (let i = 0; i < tiles.length; i++) {
        const numInCrib = i+start;
        var tileElt = tiles[i].tileElt;
        tileElt.classList.add('flip');
        tileElt.style.zIndex = numInCrib+1;
        tileElt.style.top = '33%';
        tileElt.style.left = (columnWidth+2*(numInCrib)).toString() + "%";
    }
}

function showTurn(turn) {
    const turnElt = renderTile(turn);
    turnElt.classList.add('flip');
    addTile(turnElt);
    turnElt.style.top = '33%';
    turnElt.style.left = '0%';
    setTimeout(function() {
        turnElt.classList.remove('flip');
    },500);
}

function moveOpponentCrib(deal) {
    const prevInCrib = deal.getTilesByState('crib').length;
    const oppHand = deal.getTiles('opponent','hand');
    const toCrib = oppHand.slice(oppHand.length-2);
    for (let tile of toCrib) {
        tile.state = 'crib';
    }
    positionCribTiles(toCrib,prevInCrib)
}

function revealCrib(crib) {
    const oppCrib = currentDeal.getTiles('opponent','crib');
    for (let i = 0; i < crib.length; i++) {
        const tileElt = oppCrib[i].tileElt;
        updateTileElt(tileElt, crib[i]);
    }
    
    
    const allCrib = currentDeal.getTilesByState('crib');
    allCrib.sort((obj1,obj2) => obj1.tileElt.style.zIndex - obj2.tileElt.style.zIndex);
    revealCribTile(allCrib, 3);
}

function revealCribTile(cribElts, idx) {
    const tileElt = cribElts[idx].tileElt;
    tileElt.classList.remove('flip');
    tileElt.style.top = '33%';
    tileElt.style.left = getLeftValue(3-idx, true);
    if (idx > 0) {
        setTimeout(function() {
            revealCribTile(cribElts, idx-1);
        },200);
    }
}

function movePeggedTile(tile, numPegged) {
    tile.tileElt.style.zIndex = numPegged+1;
    tile.tileElt.style.top = tile.owner === 'player' ? '31%' : '35%';
    tile.tileElt.style.left = getLeftValue(numPegged/2, true);
}

function getLeftValue(column, rightSide) {
    var leftValue = columnWidth*column;
    if (rightSide) {
        leftValue = 100-tileWidth-leftValue;
    }
    return leftValue.toString() + '%';
}

function clearTiles() {
    document.getElementById('game').innerHTML = '';
}