const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const winston = require("winston");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4000",
    methods: ["GET", "POST"],
  },
});

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.simple()),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "logs.log") }),
  ],
});

app.use(express.static("public")); // Serve static files from the 'public' directory

let rooms = [];

app.get("/rooms", (req, res) => {
  logger.info("GET /rooms called");
  res.json(rooms);
});

app.get("/room/:room_id", (req, res) => {
  logger.info("GET /room/:room_id called for room", req.params.room_id);
  const room = rooms.find((r) => r.id === req.params.room_id);
  res.json(room || {});
});

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, userId) => {
    try {
      logger.info(`User ${userId} attempting to join room ${roomId}`);
      let room = rooms.find((r) => r.id === roomId);
      if (!room) {
        room = { id: roomId, users: [], isBeingShared: false, sharerId: null };
        rooms.push(room);
        io.emit("new-room-created");
        logger.info(`New room created with ID: ${roomId}`);
      }

      if (!room.users.includes(userId)) {
        room.users.push(userId);
        logger.info(`User ${userId} added to room ${roomId}`);
      }

      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room ${roomId}`);

      const otherUsers = room.users.filter((id) => id !== userId);
      socket.emit("other-users", otherUsers);
      logger.info(
        `Notified ${userId} of other users: ${otherUsers} in room ${roomId}`
      );
      

      socket.broadcast.to(roomId).emit("new-user", userId);
      
    } catch (error) {
      logger.error(
        `Error in join-room event for user ${userId} in room ${roomId}: ${error}`
      );
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("start-sharing", async (roomId, userId) => {
    logger.info(`User ${userId} started sharing in room ${roomId}`);
    try {
      let room = rooms.find((r) => r.id === roomId);

      if (room && !room.isBeingShared) {
        room.isBeingShared = true;
        room.sharerId = userId;
        logger.info(`Broadcasting start-sharing event in room ${roomId}`);
        socket.broadcast.to(roomId).emit("start-sharing", userId);
      }
    } catch (error) {
      logger.error("Error in start-sharing event:", error);
      socket.emit("error", "Failed to start sharing");
    }
  });

  socket.on("stop-sharing", async (roomId, userId) => {
    logger.info(`User ${userId} stopped sharing in room ${roomId}`);
    try {
      let room = rooms.find((r) => r.id === roomId);
      if (room) {
        room.isBeingShared = false;
        logger.info(`Broadcasting stop-sharing event in room ${roomId}`);
        socket.broadcast.to(roomId).emit("stop-sharing");
      }
    } catch (error) {
      logger.error("Error in stop-sharing event:", error);
      socket.emit("error", "Failed to stop sharing");
    }
  });

  socket.on("leave-room", async (roomId, userId) => {
    logger.info(`User ${userId} left room ${roomId}`);
    try {
      let room = rooms.find((r) => r.id === roomId);

      if (room) {
        room.users = room.users.filter((id) => id !== userId);
      }

      socket.leave(roomId);
      socket.broadcast.to(roomId).emit("user-left", userId);
      logger.info(
        `Broadcasting user-left event to ${roomId} because ${userId} left`
      );
    } catch (error) {
      logger.error("Error in leave-room event:", error);
      socket.emit("error", "Failed to leave room");
    }
  });

  socket.on("offer", async (roomId, userId, offer) => {
    logger.info(`User ${userId} sent an offer in room ${roomId}`);
    try {
      socket.to(roomId).emit("offer", socket.id, offer);
    } catch (error) {
      logger.error("Error in offer event:", error);
      socket.emit("error", "Failed to handle offer");
    }
  });

  socket.on("answer", async (roomId, userId, answer) => {
    logger.info(`User ${userId} sent an answer in room ${roomId}`);
    try {
      logger.info("sending answer to", userId);
      io.to(userId).emit("answer", socket.id, answer);
      socket.emit("start-sharing");
    } catch (error) {
      logger.error("Error in answer event:", error);
      socket.emit("error", "Failed to handle answer");
    }
  });

  socket.on("ice-candidate", async (roomId, userId, candidate) => {
    logger.info(`User ${userId} sent an ICE candidate in room ${roomId}`);
    try {
      io.to(userId).emit("ice-candidate", socket.id, candidate);
    } catch (error) {
      logger.error("Error in ice-candidate event:", error);
      socket.emit("error", "Failed to handle ICE candidate");
    }
  });

  socket.on("disconnect", async () => {
    logger.info(`Socket ${socket.id} disconnected`);
    try {
      rooms.forEach((room, index) => {
        if (room.users.includes(socket.id)) {
          if (room.isBeingShared && socket.id === room.sharerId) {
            room.isBeingShared = false;
            room.sharerId = null;
            socket.broadcast.to(room.id).emit("stop-sharing");
          }

          room.users = room.users.filter((id) => id !== socket.id);

          if (room.users.length === 0) {
            rooms.splice(index, 1); // Remove empty room
          } else {
            socket.broadcast.to(room.id).emit("user-left", socket.id);
          }
        }
      });
    } catch (e) {
      logger.error(`Error in disconnect event for socket ${socket.id}: ${e}`);
    }
  });
});

app.get("/socket.io/socket.io.js", (req, res) => {
  res.sendFile(require.resolve("socket.io/client-dist/socket.io.js"));
});

const PORT = 4000; // You can choose any port
server.listen(PORT, () => {
  logger.info(`\nServer listening on port ${PORT}`);
});

module.exports = app;
