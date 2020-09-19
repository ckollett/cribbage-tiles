// TODO: Why bother passing deal in here? Aren't we always working with currentDeal?

function flip(tile) {
    tile.tileElt.classList.toggle('flip');
}

function enableSelection(deal) {
    for (let tile of deal.getTilesByOwner('player')) {
        enableTileSelection(tile);
    }
}

function enableTileSelection(tile) {
    tile.tileElt.onclick = () => toggleCribSelection(tile);
}

function disableSelection(deal) {
    for (let tile of deal.tiles) {
        tile.tileElt.onclick = null;
    }
}

function enablePegging(deal) {
    for (let tile of deal.getTilesByOwner('player')) {
        enableTilePegging(tile);
    }
    showGoButton();
}

function enableTilePegging(tile) {
    tile.tileElt.onclick = () => handlePeg(tile);
}

function disableTilePegging(tile) {
    tile.tileElt.onclick = null;
}

function hideButton() {
    document.getElementById('thebutton').classList.add('hidden');
}

function showSendCribButton() {
    const b = document.getElementById("thebutton");
    b.classList.remove("hidden");
    b.innerHTML = "Send to Crib";
    b.onclick = commitCrib;
    b.disabled = true;
}

function showGoButton() {
    const b = document.getElementById("thebutton");
    b.classList.remove("hidden");
    b.innerHTML = "Go";
    b.onclick = rejectGo;
    b.disabled = false;
}

function allowGo() {
    document.getElementById('thebutton').onclick = handleGo;
}

function rejectGo() {
    var actionButton = document.getElementById("thebutton");
    actionButton.innerHTML = "Nope";
    shake(actionButton, () => actionButton.innerHTML = "Go");
}

function rejectPeg(tileElt) {
    shake(tileElt)
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

function showCribButton() {
    const b = document.getElementById("thebutton");
    b.classList.remove("hidden");
    b.innerHTML = "Show Crib";
    b.onclick = requestCrib;
    b.disabled = false;
}

function showShuffleButton() {
    const b = document.getElementById("thebutton");
    b.classList.remove("hidden");
    b.innerHTML = "Shuffle";
    b.onclick = shuffle;
    b.disabled = false;
}

function setButtonEnabled(enabled) {
    document.getElementById("thebutton").disabled = !enabled;
}
