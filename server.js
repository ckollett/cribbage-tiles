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
    const playerId = players.length;
    players.push({joined : false});
    socket.request.session.playerId = playerId;
    socket.join('player_' + playerId);
    
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
            console.log('Could not find player for session ID: ' + socket.request.session.id);
        }
        let player = players[playerId];
        player.joined = true;
        player.firstDeal = arg.firstDeal;
        const joinedPlayers = players.filter(p => p.joined);
        if (joinedPlayers.length === 1 && players.length === 2) {
            // Tell the other player that a game is now pending.
            notifyPlayer(1-playerId, 'opponentJoined', player);
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
    return socket.request.session.playerId;
}

function notifyPlayer(playerId, eventName, eventData) {
    io.to('player_' + playerId).emit(eventName, eventData);
}
