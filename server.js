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

app.get('/test.html', function(request, response) {
  response.sendFile(path.join(__dirname, 'test.html'));
});

server.listen(5000, function() {
  console.log('Ready for cribbage on port 5000');
});

var game = require("./game");
var deck = require("./deck");
var currentGame = new game.game();
var currentDeal = new deal();

// Add the WebSocket handlers
io.on('connection', function(socket) {
    var notifyOtherPlayer = function(messageId, message) {
        notifyOtherPlayerById(socket.id, messageId, message);
    }
    
    socket.on("join", function(name) {
        if (currentGame.addPlayer(name, socket.id)) {
            checkNumPlayers();
        }            
    });
    
    socket.on("disconnect", function() {
        if (currentGame.removePlayer(socket.id)) {
            checkNumPlayers();
        }
    });
    
    socket.on("cribSelected", function(cards) {
        notifyOtherPlayer('opponentCrib');
        for (let card of cards) {
            getPlayer(socket.id).hand.removeCard(card);
        }
        if (currentDeal.addToCrib(socket.id, cards)) {
            var turn = currentDeal.getTopCard();
            notifyAll("fullcrib", turn);
        }
    });
    
    socket.on("pegged", function(card) {
        getPlayer(socket.id).hand.removeCard(card);
        currentDeal.playerPegged(card.pegValue);
        
        notifyOtherPlayer("opponentPegged", card);
        if (currentDeal.isGo()) {
            notifyAll("go");
        }
    });
    
    socket.on("clearPegging", function() {
        notifyOtherPlayer("clearPegging");
    })
    
    socket.on("cribRequested", function() {
        for (let crib of currentDeal.crib) {
            notifyOtherPlayerById(crib.player, "showCrib", crib.cards);
        }
    });
    
    socket.on("shuffle", function() {
        notifyAll("reset");
        currentDeal = new deal();
        dealCards();
    });
});

function deal() {
    this.cards = deck.shuffle();
    this.crib = [];
    this.pegRemaining = 31;
    
    this.addToCrib = function(id,cards) {
        this.crib.push({"player":id,"cards":cards});
        return this.crib.length === 2;
    }
    
    this.getTopCard = function() {
        return this.cards.pop();
    }
        
    this.dealHand = function() {
        return this.cards.splice(0,6);
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
    
    return this;
}

function reset() {
    currentDeal = new deal();
}

function checkNumPlayers() {
    if (currentGame.players.length === 2) {
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
        notifyPlayer(opponent, "opponentName", player.name);
    }
}

function getPlayer(id) {
    for (let player of currentGame.players) {
        if (player.id === id) {
            return player;
        }
    }
    return null;
}

function notifyPlayer(player, messageId, message) {
    io.to(player.id).emit(messageId, message);
}

function notifyOtherPlayerById(id, messageId, message) {
    for (let player of currentGame.players) {
        if (player.id !== id) {
            notifyPlayer(player, messageId, message);
        }
    }
}

function notifyAll(messageId, message) {
    io.sockets.emit(messageId, message);
}