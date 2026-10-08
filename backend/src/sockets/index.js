const { Server } = require('socket.io');
const env = require('../config/env');
const slotService = require('../services/slot.service');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') },
  });

  // Every new browser gets the current picture immediately, then live updates.
  io.on('connection', async (socket) => {
    try {
      socket.emit('slots:update', await slotService.getPublicSlots());
    } catch (err) {
      console.error('Failed to send initial slots:', err.message);
    }
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

module.exports = { initSocket, getIO };
