const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4000",
    methods: ["GET", "POST"],
  },
});

app.use(express.static("public")); // Serve static files from the 'public' directory

let rooms = [];

app.get("/rooms", (req, res) => {
  res.json(rooms);
});

app.get("/room/:room_id", (req, res) => {
  const room = rooms.find((r) => r.id === req.params.room_id);
  res.json(room || {});
});

io.on("connection", (socket) => {
  socket.on("join-room", async (roomId, userId) => {
    try {
      let room = rooms.find((r) => r.id === roomId);
      if (!room) {
        room = { id: roomId, users: [], isBeingShared: false, sharerId: null };
        rooms.push(room);
        io.emit("new-room-created");
      }

      if (!room.users.includes(userId)) {
        room.users.push(userId);
      }

      socket.join(roomId);

      const otherUsers = room.users.filter((id) => id !== userId);
      socket.emit("other-users", otherUsers);

      if (room.isBeingShared) {
        socket.emit("start-sharing");
        io.to(room.sharerId).emit("new-user-joined", userId);
      }
    } catch (error) {
      console.error("Error in join-room event:", error);
      socket.emit("error", "Failed to join room");
    }
  });

  socket.on("start-sharing", async (roomId, userId) => {
    try {
      let room = rooms.find((r) => r.id === roomId);

      if (room && !room.isBeingShared) {
        room.isBeingShared = true;
        room.sharerId = userId;

        socket.broadcast.to(roomId).emit("start-sharing");
      }
    } catch (error) {
      console.error("Error in start-sharing event:", error);
      socket.emit("error", "Failed to start sharing");
    }
  });

  socket.on("stop-sharing", async (roomId, userId) => {
    try {
      let room = rooms.find((r) => r.id === roomId);
      if (room) {
        room.isBeingShared = false;
        socket.broadcast.to(roomId).emit("stop-sharing");
      }
    } catch (error) {
      console.error("Error in stop-sharing event:", error);
      socket.emit("error", "Failed to stop sharing");
    }
  });

  socket.on("leave-room", async (roomId, userId) => {
    try {
      let room = rooms.find((r) => r.id === roomId);

      if (room) {
        room.users = room.users.filter((id) => id !== userId);
      }

      socket.leave(roomId);
      socket.broadcast.to(roomId).emit("user-left", userId);
    } catch (error) {
      console.error("Error in leave-room event:", error);
      socket.emit("error", "Failed to leave room");
    }
  });

  socket.on("offer", async (roomId, userId, offer) => {
    try {
      socket.to(roomId).emit("offer", socket.id, offer);
    } catch (error) {
      console.error("Error in offer event:", error);
      socket.emit("error", "Failed to handle offer");
    }
  });

  socket.on("answer", async (roomId, userId, answer) => {
    try {
      io.to(userId).emit("answer", socket.id, answer);
    } catch (error) {
      console.error("Error in answer event:", error);
      socket.emit("error", "Failed to handle answer");
    }
  });

  socket.on("ice-candidate", async (roomId, userId, candidate) => {
    try {
      io.to(userId).emit("ice-candidate", socket.id, candidate);
    } catch (error) {
      console.error("Error in ice-candidate event:", error);
      socket.emit("error", "Failed to handle ICE candidate");
    }
  });

  socket.on("disconnect", async () => {
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
      console.error("Error in disconnect event:", e);
    }
  });
});

app.get("/socket.io/socket.io.js", (req, res) => {
  res.sendFile(require.resolve("socket.io/client-dist/socket.io.js"));
});

const PORT = 4000; // You can choose any port
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
