function setupMessages() {
    const messages = document.getElementById('messageinput');
    messages.addEventListener('keyup', sendMessage);
}

function sendMessage(e) {
    var keyCode = e.code || e.key;
    if (keyCode == 'Enter') {
        const inputField = document.getElementById('messageinput');
        const message = inputField.value;
        if (message && message.length > 0) {
            inputField.value = "";
            addMessage(message, 'player');
            emitMessage(message);
        }
    }   
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