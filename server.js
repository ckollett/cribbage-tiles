const port = 4556;

const game = require("./game");
const tiles = require("./tiles");
const scoring = require("./scoring");

// Dependencies
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const app = express();
const server = http.Server(app);
const io = socketIO(server);
app.set('port', port);

// We could improve the recovery by keeping every event in an array,
// and including the array index as part of the data sent to the browser.
// Then if the browser disconnects and reconnects, on reconnect it could
// tell the server the ID of the last event it received and the server
// could send the subsequent events.
game.registerListener(function(player, evt) {
    io.to(players[player].socket).emit('gameEvent', evt);
});
game.newGame();
const players = [];

/* *** Static content used by the front end *** */
app.use('/static', express.static(__dirname + '/static'));
app.get('/shared/tiles.js', function(request, response) {
    response.sendFile(path.join(__dirname, 'tiles.js'));
});
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'ui.html'));
});
app.get('/reset', function(request, response) {
    console.log('***** Resetting *****');
    players.length = 0;
    game.newGame();
    response.sendFile(path.join(__dirname, 'ui.html'));
});
app.get('/game', function(request, response) {
    const fullGame = game.getFullGame();
    response.send(JSON.stringify(fullGame));
});
// app.get('/pendingScore', function(request, response) {
//     response.send(JSON.stringify(game.getPendingScore()));

// });

server.listen(port, function() {
  console.log('Ready for cribbage on port ' + port);
});

/* *** Set up messaging with the browser *** */
io.on('connection', function(socket) {
    const playerId = players.length;
    console.log(`Player ${playerId} joined with socket ID ${socket.id}`);
    players.push({socket: socket.id});
    
    // As soon as a player joins, they should be registered
    socket.on('checkForGame', function(arg, callback) {
        const joinedPlayers = players.filter(p => p.joined);
        const response = {id: playerId};
        if (joinedPlayers.length === 1) {
            // The other player is waiting for you to join.
            response.opponent = joinedPlayers[0];
        }
        callback(response);
    });
    
    socket.on('join', function(arg, callback) {
        let playerId = getPlayerIdForSocket(socket);
        if (playerId < 0 || playerId > 1) {
            console.log('Could not find player for socket ID: ' + socket.id);
        }
        let player = players[playerId];
        // TODO: when the second player joins we need to check if the first
        // player is dealer or not.
        player.joined = true;
        player.firstDeal = arg.firstDeal;
        const joinedPlayers = players.filter(p => p.joined);
        if (joinedPlayers.length === 1 && players.length === 2) {
            console.log('Tell the other player this player has joined');
            const opponent = players[1-playerId];
            console.log('Opponent socket: ' + opponent.socket);
            // Tell the other player that a game is now pending.
            io.to(opponent.socket).emit('opponentJoined', player);
        }
        
        if (joinedPlayers.length === 2) {
            const dealer = arg.firstDeal ? playerId : 1-playerId;
            console.log('First dealer is ' + dealer);
            game.deal(dealer);
        }
    });
    
    socket.on('cribselect', function(arg) {
        const player = getPlayerIdForSocket(socket);
        game.handleTileEvent(player, arg);
    });
    
    socket.on('peg', function(arg) {
        const player = getPlayerIdForSocket(socket);
        game.handleTileEvent(player, arg);
    });
    
    socket.on('countScore', function() {
        const player = getPlayerIdForSocket(socket);
        const pendingScore = game.getPendingScore();
        if (pendingScore.length === 0) {
            console.log('No pending score');
            return;
        }
        
        if (pendingScore.player !== player) {
            console.log(`Player ${player} does not have a pending score`);
            return;
        }
        
        game.countScore();
    });
    
    socket.on('getScore', function(arg, callback) {
        if (arg === 'pending') {
            callback(game.getPendingScore());
        } else {
            callback(game.getScoreById(arg));
        }
    });
    
    socket.on('scoringStats', function(arg, callback) {
        callback(game.getScoringStats());
    });
    
    socket.on('disconnect', function() {
        const player = getPlayerIdForSocket(socket);
        console.log(`Player ${player} disconnected.`);
    });
});

function getPlayerIdForSocket(socket) {
    return players.findIndex(p => p.socket === socket.id);
}

function getPlayerInfo(socket) {
    return players.find(p => p.socket === socket.id);
}
