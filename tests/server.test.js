const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const app = require("../server"); // Assuming server.js is in the parent directory

describe("socket.io server tests", () => {
  let io, serverSocket, clientSocket, clientSocket2;

  beforeAll((done) => {
    httpServer = createServer(app);
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      clientSocket2 = new Client(`http://localhost:${port}`);
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  afterAll((done) => {
    io.close();
    clientSocket.close();
    httpServer.close(() => done());
  });

  test("should join room and notify other users", (done) => {
    const roomId = "testRoom";
    serverSocket.on("join-room", (userId) => {
      expect(userId).toBe(clientSocket.id);
      clientSocket.on("other-users", (otherUsers) => {
        expect(otherUsers).toEqual([]);
        done();
      });
    });
    clientSocket.emit("join-room", roomId, clientSocket.id);
  });

  test("should handle start-sharing", (done) => {
    const roomId = "testRoom";
    clientSocket.emit("start-sharing", roomId, clientSocket.id);

    serverSocket.on("start-sharing", () => {
      done();
    });
  });

  test("should handle stop-sharing", (done) => {
    const roomId = "testRoom";
    clientSocket.emit("stop-sharing", roomId, clientSocket.id);

    serverSocket.on("stop-sharing", () => {
      done();
    });
  });

  test("should handle offer", (done) => {
    const roomId = "testRoom";
    const offer = { sdp: "sdp-offer", type: "offer" };
    clientSocket.emit("offer", roomId, clientSocket.id, offer);

    serverSocket.on("offer", (actualRoomId, actualSocketId, actualOffer) => {
      expect(actualRoomId).toBe(roomId);
      expect(actualSocketId).toBe(clientSocket.id);
      expect(actualOffer).toEqual(offer);
      done();
    });
  });

  test("should handle answer", (done) => {
    const roomId = "testRoom";
    const answer = { sdp: "sdp-answer", type: "answer" };
    clientSocket.emit("answer", roomId, clientSocket.id, answer);

    serverSocket.on("answer", (actualRoomId, actualSocketId, actualAnswer) => {
      expect(actualRoomId).toBe(roomId);
      expect(actualSocketId).toBe(clientSocket.id);
      expect(actualAnswer).toEqual(answer);
      done();
    });
  });

  test("should handle ice-candidate", (done) => {
    const roomId = "testRoom";
    const candidate = { candidate: "candidate-string", sdpMLineIndex: 0 };
    clientSocket.emit("ice-candidate", roomId, clientSocket.id, candidate);

    serverSocket.on("ice-candidate", (actualRoomId, actualSocketId, actualCandidate) => {
      expect(actualRoomId).toBe(roomId);
      expect(actualSocketId).toBe(clientSocket.id);
      expect(actualCandidate).toEqual(candidate);
      expect(serverSocket.to(roomId).emit()).toHaveBeenCalledWith('ice-candidate', clientSocket.id, candidate)
      done();
    });
  });

  test("should handle user leaving the room", (done) => {
    const roomId = "testRoom";
    clientSocket.emit("leave-room", roomId, clientSocket.id);

    serverSocket.on("user-left", (userId) => {
      expect(userId).toBe(clientSocket.id);
      done();
    });
  });

  // Additional tests can be added here to cover more scenarios
});
