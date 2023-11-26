const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const logger = require("./logger");
const {
  createWorker,
  createWebRtcTransport,
  connectTransport,
  createProducer,
  createConsumer,
} = require("./sfu-mediasoup.js");

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

app.use(express.static("./public"));

let mediaSoupWorker;

createWorker().then((worker) => {
  mediaSoupWorker = worker;
});

function getRoom(roomId) {
  return rooms[roomId];
}

let rooms = {};

app.get("/rooms", (req, res) => {
  logger.info("GET /rooms called");
  res.json(rooms);
});

io.on("connection", (socket) => {
  socket.on("create-producer-transport", async (roomId, userId, callback) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        throw new Error(`Room with ID ${roomId} does not exist`);
      }

      const user = room.users.find((u) => u.userId === userId);
      if (!user) {
        throw new Error(
          `User with ID ${userId} does not exist in room ${roomId}`
        );
      }

      const transportParams = await createWebRtcTransport(mediaSoupWorker);
      user.producerTransport = transportParams;

      logger.info("transportParams:", transportParams);

      if (typeof callback === "function") {
        callback({ params: transportParams });
      }
    } catch (error) {
      logger.error("create-producer-transport error:", error);
      if (typeof callback === "function") {
        callback({ error: error.toString() });
      }
    }
  });


  socket.on(
    "connect-producer-transport",
    async (roomId, userId, dtlsParameters, callback) => {
      logger.info("Received DTLS Parameters:", dtlsParameters);
      const userTransportId = getRoom(roomId).users.find((u) => u.userId === userId).producerTransport.id;
      try {
        await connectTransport(
          userTransportId,
          dtlsParameters
        );
        callback({});
      } catch (error) {
        logger.error("connect-producer-transport error:", error);
        callback({ error: error.toString() });
      }
    }
  );

  socket.on(
    "produce",
    async (roomId, userId, kind, rtpParameters, callback) => {
      try {
        const producer = await createProducer(
          getRoom(roomId).users.find((u) => u.userId === userId)
            .producerTransport,
          kind,
          rtpParameters
        );
        getRoom(roomId)
          .users.find((u) => u.userId === userId)
          .producers.push(producer);
        callback({ id: producer.id });
      } catch (error) {
        logger.error("produce error:", error);
        callback({ error: error.toString() });
      }
    }
  );

  socket.on("join-room", async (roomId, userId) => {
    try {
      logger.info(`User ${userId} attempting to join room ${roomId}`);
      let room = getRoom(roomId);
      if (!room) {
        room = {
          id: roomId,
          users: [],
          isBeingShared: false,
          sharerId: null,
        };
        rooms[roomId] = room;
        io.emit("new-room-created");
        logger.info(`New room created with ID: ${roomId}`);
      }

      let user = room.users.find((u) => u.userId === userId);
      if (!user) {
        user = {
          userId: userId,
          producerTransport: null,
          consumerTransport: null,
          producers: [],
          consumers: [],
        };
        room.users.push(user);
        logger.info(`User ${userId} added to room ${roomId}`);
      }

      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room ${roomId}`);

      const otherUsers = room.users
        .filter((u) => u.userId !== userId)
        .map((u) => u.userId);

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

  socket.on(
    "connect-consumer-transport",
    async (roomId, userId, dtlsParameters, callback) => {
      try {
        await connectTransport(
          getRoom(roomId).users.find((u) => u.userId === userId)
            .consumerTransport,
          dtlsParameters
        );
        callback({});
      } catch (error) {
        logger.error("connect-consumer-transport error:", error);
        callback({ error: error.toString() });
      }
    }
  );

  socket.on(
    "consume",
    async (roomId, userId, producerId, rtpCapabilities, callback) => {
      try {
        const { id, kind, rtpParameters } = await createConsumer(
          producerId,
          rtpCapabilities,
          getRoom(roomId).users.find((u) => u.userId === userId)
            .consumerTransport.id
        );

        getRoom(roomId)
          .users.find((u) => u.userId === userId)
          .consumers.push({ id, producerId });

        callback({ id, kind, rtpParameters });
      } catch (error) {
        logger.error("consume error:", error);
        callback({ error: error.toString() });
      }
    }
  );

  socket.on("start-sharing", async (roomId, userId) => {
    logger.info(`User ${userId} started sharing in room ${roomId}`);
    try {
      let room = getRoom(roomId);

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
      let room = getRoom(roomId);

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
      let room = getRoom(roomId);

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

  socket.on("disconnect", async () => {
    logger.info(`Socket ${socket.id} disconnected`);
    try {
      Object.keys(rooms).forEach((roomId) => {
        const room = rooms[roomId];

        const userIndex = room.users.findIndex(
          (user) => user.userId === socket.id
        );

        if (userIndex !== -1) {
          if (room.isBeingShared && room.sharerId === socket.id) {
            room.isBeingShared = false;
            room.sharerId = null;
            socket.broadcast.to(room.id).emit("stop-sharing");
          }

          room.users.splice(userIndex, 1);

          if (room.users.length === 0) {
            delete rooms[roomId];
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

const PORT = 4000;
server.listen(PORT, () => {
  logger.info(`*************************************************************`);
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app;
