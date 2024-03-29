var game = require("./game");
var deck = require("./deck");
var currentGame = new game.game();
var currentDeal = new deal();


// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});// Starts the server.

app.get('/hands.html', function(request, response) {
    response.sendFile(path.join(__dirname, 'hands.html'));
});

app.get('/tiles', function(request, response) {
    const newDeal = new deal();
    const hand1 = newDeal.dealHand();
    const hand2 = newDeal.dealHand();
    const turn = newDeal.getTopCard();
    response.send(JSON.stringify([hand1,hand2,turn]));
})

server.listen(5000, function() {
  console.log('Ready for cribbage on port 5000');
});

// Add the WebSocket handlers
io.on('connection', function(socket) {
    const playerName = getPlayerName(socket);
    if (playerName) {
        console.log(playerName + ' connected');
        const player = getPlayerByName(playerName);
        if (player) {
            player.id = socket.id;
            notifyOtherPlayerByName(player.name, 'opponentMessage', player.name + " reconnected!");
        }
    }
    
    var notifyOtherPlayer = function(messageId, message) {
        const thisPlayer = getPlayerForSocket(socket);
        if (thisPlayer) {
            notifyOtherPlayerByName(thisPlayer.name, messageId, message);
        }
    }
    
    socket.on("join", function(playerInfo) {
        if (currentGame.addPlayer(playerInfo, socket.id)) {
            checkNumPlayers();
        }
    });
    
    socket.on("quit", function() {
        const thisPlayer = getPlayerForSocket(socket);
        if (thisPlayer) {
            console.log(thisPlayer.name + " quit");
            notifyOtherPlayer('quit');
            currentGame = new game.game();
        }
    });
    
    socket.on("disconnect", function() {
        const player = getPlayerForSocket(socket);
        if (player) {
            console.log(player.name + ' disconnected');
        } else {
            console.log('Unknown player disconnected');
        }
    });
    
    socket.on("cribSelected", function(cards) {
        notifyOtherPlayer('opponentCrib');
        const thisPlayer = getPlayerForSocket(socket);
        for (let card of cards) {
            thisPlayer.hand.removeCard(card);
        }
        
        if (currentDeal.addToCrib(thisPlayer.name, cards)) {
            var turn = currentDeal.turn();
            
            // This is here to make it easier to debug nobs issues.
            // var turn = deck.getJack();
            notifyAll("fullcrib", turn);
        }
    });
    
    socket.on("pegged", function(card) {
        let player = getPlayerForSocket(socket);
        player.hand.removeCard(card);
        currentDeal.playerPegged(card.pegValue);
        let go = currentDeal.isGo();
        let bummer = false;
        if (!go) {
            let otherPlayer = getOtherPlayerBySocket(socket);
            if (otherPlayer.hand.isGo(currentDeal.pegRemaining)) {
                bummer = true;
            }
        }
        
        let pegData = {
            'card' : card,
            'go' : go,
            'bummer' : bummer
        }
        notifyOtherPlayer("opponentPegged", pegData);
        notifyPlayer(player, "afterPeg", pegData);
    });
    
    socket.on("clearPegging", function() {
        notifyOtherPlayer("clearPegging");
    })
    
    socket.on("cribRequested", function() {
        for (let crib of currentDeal.crib) {
            notifyOtherPlayerByName(crib.player, "showCrib", crib.cards);
        }
    });
    
    socket.on("toggleDark", function() {
        notifyOtherPlayer("toggleDark");
    });
    
    
    socket.on("shuffle", function() {
        currentDeal = new deal();
        dealCards();
    });
    
    socket.on("score", function(points) {
        notifyOtherPlayer("opponentScored", points);
    });
    
    socket.on("updateHistory", function(newScore) {
        notifyOtherPlayer("updateHistory", newScore);
    });
    
    socket.on("message", function(msg) {
        notifyOtherPlayer("opponentMessage", msg);
    });
});

function deal() {
    this.cards = deck.shuffle();
    this.crib = [];
    this.turn = null;
    this.pegRemaining = 31;
    
    this.createHands = function() {
        let hand1 = [];
        let hand2 = [];
        for (let i = 0; i < 6; i++) {
            hand1.push(this.cards[2*i]);
            hand2.push(this.cards[2*i+1]);
        }
        this.hands = [hand1, hand2];
    }

    this.createHands();
    
    this.addToCrib = function(name,cards) {
        this.crib.push({"player":name,"cards":cards});
        return this.crib.length === 2;
    }
    
    this.getTopCard = function() {
        return this.cards.pop();
    }
        
    this.dealHand = function() {
        let cards = this.hands.shift();
        return cards.slice();
    }
    
    this.playerPegged = function(pegValue) {
        this.pegRemaining -= pegValue;
        return this.pegRemaining;
    }
    
    this.isPeggingFinished = function() {
        for (let player of currentGame.players) {
            if (player.hand.cards.length > 0) {
                return false;
            }
        }
        return true;
    }

    this.isGo = function() {
        for (let player of currentGame.players) {
            if (!player.hand.isGo(this.pegRemaining)) {
                return false;
            }
        }
        this.pegRemaining = 31;
        return true;
    }

    this.getCrib = function() {
        return this.crib;
    }
    
    this.turn = function() {
        this.turn = this.getTopCard();
        return this.turn;
    }
    
    return this;
}

function reset() {
    currentDeal = new deal();
}

function checkNumPlayers() {
    console.log('In checkNumPlayers. Found ' + currentGame.players.length);
    if (currentGame.players.length === 2) {
        console.log('Starting a game');
        sendPlayerInfo();
        dealCards();
    } else {
        reset();
        notifyAll("reset");
    }
}

function dealCards() {
    for (var i = 0; i < 2; i++) {
        var player = currentGame.players[i];
        var opponent = currentGame.players[1-i];
        const cards = currentDeal.dealHand();
        player.dealTo(cards);
        notifyPlayer(player, "hand", cards);
    }
}

function sendPlayerInfo() {
    const firstDealer = detectFirstDeal(currentGame.players);
    for (var i = 0; i < 2; i++) {
        var player = currentGame.players[i];
        var opponent = currentGame.players[1-i];
        playerInfo = {
            'playerName' : player.name,
            'opponentName' : opponent.name,
            'firstDeal' : firstDealer
        };
        notifyPlayer(player, 'playerInfo', playerInfo);
    }
}

function detectFirstDeal(players) {
    const d1 = players[0].firstDeal;
    const d2 = players[1].firstDeal;
    
    if (d1 && d2) {
        return d1 == d2 ? d1 : null;
    } else if (!d1) {
        return d2;
    } else {
        return d1;
    }
}

function getPlayerForSocket(socket) {
    // This is pretty backwards, but whatever.
    const name = getPlayerName(socket);
    return getPlayerByName(name);
}

function getPlayerByName(name) {
    // Move this to game.js?
    for (let player of currentGame.players) {
        if (player.name === name) {
            return player;
        }
    }
    return null;
}

function notifyPlayer(player, messageId, message) {
    io.to(player.id).emit(messageId, message);
}

function notifyOtherPlayerByName(name, messageId, message) {
    let otherPlayer = getOtherPlayerByName(name);
    if (otherPlayer) {
        notifyPlayer(otherPlayer, messageId, message);
    }
}

function getOtherPlayerBySocket(socket) {
    const thisPlayer = getPlayerForSocket(socket);
    return getOtherPlayerByName(thisPlayer.name);
}

function getOtherPlayerByName(name) {
    for (let player of currentGame.players) {
        if (player.name !== name) {
            return player;
        }
    }
}

function notifyAll(messageId, message) {
    io.sockets.emit(messageId, message);
}

function getPlayerName(socket) {
    // First try getting the player using the socket ID.
    if (currentGame) {
        const player = currentGame.getPlayerById(socket.id);
        if (player && player.name) {
            return player.name;
        }
    }
    
    const cookieValue = socket.handshake.headers.cookie;
    let name = null;
    if (cookieValue) {
        const namePart = cookieValue.split('; ').find(row => row.startsWith('cribbageplayer'));
        if (namePart) {
            name = namePart.split('=')[1];
        }
    }
    return name;
}
