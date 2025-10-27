const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const citiesData = require('./cities.json');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
const games = {};
function getNextLetter(city) {
  let clean = city.toLowerCase().replace(/ь|ъ|ы$/g, '');
  return clean[clean.length - 1];
}
io.on('connection', (socket) => {
  socket.on('create-room', (callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    games[roomId] = { players: [socket.id], history: [], used: new Set(), lastLetter: null, turn: 0 };
    socket.join(roomId);
    callback({ roomId, playerId: 0 });
  });
  socket.on('join-room', ({ roomId }, callback) => {
    const game = games[roomId];
    if (!game) return callback({ error: 'Комната не найдена' });
    if (game.players.length >= 2) return callback({ error: 'Комната заполнена' });
    game.players.push(socket.id);
    socket.join(roomId);
    callback({ success: true, playerId: 1 });
    io.to(roomId).emit('game-start');
  });
  socket.on('make-move', ({ roomId, city, playerId }) => {
    const game = games[roomId];
    if (!game || game.turn !== playerId) return;
    const norm = city.trim().toLowerCase();
    const allCities = new Set(Object.values(citiesData).flat().map(c => c.toLowerCase()));
    if (game.used.has(norm)) return socket.emit('error', 'Город уже использовался');
    if (!allCities.has(norm)) return socket.emit('error', 'Такого города не существует');
    if (game.history.length > 0) {
      const requiredLetter = game.lastLetter;
      if (norm[0] !== requiredLetter) {
        return socket.emit('error', `Город должен начинаться на "${requiredLetter.toUpperCase()}"`);
      }
    }
    game.used.add(norm);
    game.history.push({ player: playerId, city });
    game.lastLetter = getNextLetter(city);
    game.turn = 1 - playerId;
    io.to(roomId).emit('move', { city, playerId, nextTurn: game.turn });
  });
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
