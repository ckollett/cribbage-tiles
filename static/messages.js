function setupMessages() {
    const messages = document.getElementById('messageinput');
    messages.addEventListener('keyup', handleMessageEvent);
    messages.focus();
    messages.onblur = messages.focus;
}

function handleMessageEvent(e) {
    var keyCode = e.code || e.key;
    if (keyCode == 'Enter') {
        const inputField = document.getElementById('messageinput');
        const message = inputField.value;
        if (message && message.length > 0) {
            inputField.value = "";
            sendMessage(message);
        }
    }   
}

function sendMessage(msg) {
    addMessage(msg, 'player');
    emitMessage(msg);
}

function addMessage(msg, player) {
    const template = document.querySelector('#messageTemplate');
    const rowElt = template.content.cloneNode(true).firstElementChild;
    const msgElt = rowElt.querySelector('.message');
    msgElt.innerHTML = msg;
    msgElt.classList.add(player + 'Message');
    
    const messagesArea = document.getElementById('messages');
    messagesArea.prepend(rowElt);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function sendCribSheetMessage() {
    const name = document.getElementById('playerName').innerHTML;
    if (name && name != "") {
        sendMessage(name + " opened the crib sheet");
    }
}