// TODO:
// - Use cookies and rooms for emitting events rather than using socket IDs?
//   - https://socket.io/docs/v4/rooms/
//   - That *should* make dropping/joining more robust, right?
// - Only emit game events when both players are in the game.
//   - If there's only one player joined, just hold on to the event until the second player rejoins
//   - Also we could emit a "game paused" event to the remaining player when this happens, to freeze the UI

const port = 4556;

const game = require("./game");
const tiles = require("./tiles");
const scoring = require("./scoring");

// Dependencies
const express = require('express');
const session = require("express-session");
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const sess = session({
    secret : "atomic cribbage",
    resave : false,
    saveUninitialized : true
});
app.use(sess);
app.set('port', port);

const server = http.Server(app);
const io = socketIO(server);
io.engine.use(sess);

// We could improve the recovery by keeping every event in an array,
// and including the array index as part of the data sent to the browser.
// Then if the browser disconnects and reconnects, on reconnect it could
// tell the server the ID of the last event it received and the server
// could send the subsequent events.
game.registerListener(function(player, evt) {
    notifyPlayer(player, 'gameEvent', evt);
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
    let player = getPlayerForSocket(socket);
    if (!player) {
        player = {
            sessionId: socket.request.session.id,
            id : players.length,
            joined : false
        }
        console.log('Adding player ' + player.id);
        players.push(player);
    }
    socket.join('player_' + player.id);
    
    // As soon as a player joins, they should be registered
    socket.on('checkForGame', function(arg, callback) {
        // The checkForGame event is sent on page load. We
        // can add logic here to cover:
        // * No one has joined
        // * Your opponent has joined but you haven'tags
        // * There are already 2 players who have joined
        // In the last case I guess we can provide the option
        // to either start a new game or (eventually) attempt
        // to rejoin the in-progress game.
        const joinedPlayers = players.filter(p => p.joined);
        const response = {id: player.id};
        if (joinedPlayers.length === 1) {
            // The other player is waiting for you to join.
            response.opponent = joinedPlayers[0];
        } else if (joinedPlayers.length === 2) {
            // Reset.
            console.log('Reload?');
            players.forEach(p => p.joined = false);
            game.newGame();
        }
        callback(response);
    });
    
    socket.on('join', function(arg, callback) {
        let player = getPlayerForSocket(socket);
        if (!player) {
            console.log('Could not find player for session ID: ' + socket.request.session.id);
            return;
        }
        player.joined = true;
        player.firstDeal = arg.firstDeal;
        const joinedPlayers = players.filter(p => p.joined);
        if (joinedPlayers.length === 1 && players.length === 2) {
            // Tell the other player that a game is now pending.
            notifyPlayer(1-player.id, 'opponentJoined', player);
        }
        
        if (joinedPlayers.length === 2) {
            const dealer = arg.firstDeal ? player.id : 1-player.id;
            console.log('First dealer is ' + dealer);
            game.deal(dealer);
        }
    });
    
    socket.on('cribselect', function(arg) {
        const player = getPlayerForSocket(socket);
        game.handleTileEvent(player.id, arg);
    });
    
    socket.on('peg', function(arg) {
        const player = getPlayerForSocket(socket);
        game.handleTileEvent(player.id, arg);
    });
    
    socket.on('countScore', function() {
        const player = getPlayerForSocket(socket);
        const pendingScore = game.getPendingScore();
        if (pendingScore.length === 0) {
            console.log('No pending score');
            return;
        }
        
        if (pendingScore.player !== player.id) {
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
        const player = getPlayerForSocket(socket);
        if (player) {
            console.log(`Player ${player.id} disconnected.`);
        }
    });
});

function getPlayerForSocket(socket) {
    return players.find(p => p.sessionId === socket.request.session.id);
}

function notifyPlayer(playerId, eventName, eventData) {
    io.to('player_' + playerId).emit(eventName, eventData);
}
