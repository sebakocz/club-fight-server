const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origins: ['http://localhost:8080']
    }
});

const BASE_STATS = {
    health: 80,
}

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
        room.players.push({ id: socket.id, ...player, ...BASE_STATS });
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

    socket.on('attack', (data) => {
        console.log('attack', data, socket.id);
        const room = rooms.find(room => room.players.find(player => player.id === socket.id));
        if (room) {
            const attacker = room.players.find(player => player.id === socket.id);
            const defender = room.players.find(player => player.id !== socket.id);
            const damage = data.damage;
            defender.health -= damage;
            console.log(`${attacker.name} attacked ${defender.name} for ${damage} damage`);
            io.to(room.id).emit('damage', { damage, defender });
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});