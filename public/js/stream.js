import { updateButtonUI, adjustUIForStreaming } from "./ui-controls.js";

export async function startSharing(stateHandler) {
  const {
    getSocket,
    updateRemoteStream,
    updateIsSharing,
    updateSharerId,
    getRoomId,
  } = stateHandler;

  const socket = getSocket();

  try {
    const remoteStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: 1920,
        height: 1080,
        frameRate: 30,
      },
      audio: true,
    });

    updateRemoteStream(remoteStream);
    updateIsSharing(true);
    updateSharerId(socket.id);
    updateButtonUI(true);

    const transportInfo = await createProducerTransport(socket, getRoomId());
    const producerId = await startProducing(
      socket,
      getRoomId(),
      transportInfo.id,
      remoteStream
    );

    adjustUIForStreaming(true, socket, socket.id);
    socket.emit("start-sharing", getRoomId(), socket.id);
  } catch (error) {
    console.error("Error starting screen sharing.", error);
    updateIsSharing(false);
    updateButtonUI(false);
    adjustUIForStreaming(false, socket, null);
  }
}

export async function stopSharing(stateHandler) {
  const {
    getSocket,
    getRemoteStream,
    updateRemoteStream,
    updateIsSharing,
    updateSharerId,
    getRoomId,
  } = stateHandler;

  const socket = getSocket();
  const remoteStream = getRemoteStream();

  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
  }

  updateRemoteStream(null);
  updateIsSharing(false);
  updateSharerId(null);
  adjustUIForStreaming(false, socket, null);
  updateButtonUI(false);

  stopProducing(socket, getRoomId());
  socket.emit("stop-sharing", getRoomId(), socket.id);
}

async function createProducerTransport(socket, roomId, userId) {
  return new Promise((resolve, reject) => {
    socket.emit(
      "create-producer-transport",
      roomId,
      userId,
      (err, transportInfo) => {
        if (err) {
          reject(err);
        } else {
          resolve(transportInfo);
        }
      }
    );
  });
}

async function startProducing(socket, roomId, transportId, stream) {
  return new Promise((resolve, reject) => {
    socket.emit(
      "start-producing",
      roomId,
      transportId,
      stream,
      (err, producerId) => {
        if (err) {
          reject(err);
        } else {
          resolve(producerId);
        }
      }
    );
  });
}

async function stopProducing(socket, roomId) {
  socket.emit("stop-producing", roomId);
}
