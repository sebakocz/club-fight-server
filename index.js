const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origins: ['http://localhost:8080']
    }
});

app.get('/', (req, res) => {
    res.send('<h1>Hey Socket.io</h1>');
});

// Store rooms and their player IDs
const rooms = [];

io.on('connection', socket => {
    socket.emit('connection', null);

    socket.on('join', player => {
        let room = rooms.find(room => room.players.length < 2);
        if (!room) {
            room = { id: socket.id, players: [] };
            rooms.push(room);
        }
        room.players.push({ id: socket.id, ...player });
        socket.join(room.id);
        console.log('Player joined room', room.id, room.players);
        if (room.players.length === 2) {
            // start the game
            io.to(room.id).emit('start', room.players);
        }
    });

    socket.on('disconnect', () => {
        const room = rooms.find(room => room.players.find(player => player.id === socket.id));
        if (room) {
            room.players = room.players.filter(player => player.id !== socket.id);
            socket.leave(room.id);
            console.log('Player disconnected from room', room.id, room.players);
            if (room.players.length === 1) {
                // end the game
                io.to(room.id).emit('end');
            }
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});