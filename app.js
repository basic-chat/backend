const express = require('express');
const app = express();
const socketio = require('socket.io');
const http = require('http');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users'); 

const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

app.use(cookieParser());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/mernauth', {useUnifiedTopology: true, useNewUrlParser: true}, () => {
    console.log('successfully connected to database');
});

const userRouter = require('./routes/User');
app.use('/user', userRouter)

const server = http.createServer(app);
const io = socketio(server)

app.get('/', (req, res) => {
    res.send('Server running')
})

io.on('connection', (socket) => {
    console.log('We have a new connection.');

    socket.on('join', ({name, room}, callback) => {
        const {error, user} = addUser({ id: socket.id, name, room});

        if(error) return callback(error)
    
        socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`});
        socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name}, has joined!`});

        socket.join(user.room);
        
        io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)})
        callback();
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('message', {user: user.name, text: message})
        io.to(user.room).emit('roomData', {user: user.name, text: message})

        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if(user) {
            io.to(user.room).emit('message', {user: 'admin', text: `${user.name} has left`})
        }
    })
})

server.listen(8000, () => {
    console.log('express server started')
})