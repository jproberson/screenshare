import { updateButtonUI, adjustUIForStreaming } from "./ui-controls.js";

export async function startSharing(stateHandler) {
  const {
    getSocket,
    updateRemoteStream,
    updateIsSharing,
    updateSharerId,
    getRoomId,
    getDevice,
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
    remoteStream.getTracks().forEach(track => {
      console.log(`Track kind: ${track.kind}, label: ${track.label}`);
    });

    updateRemoteStream(remoteStream);
    updateIsSharing(true);
    updateSharerId(socket.id);
    updateButtonUI(true);

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

  await stopProducing(socket, getRoomId());
  socket.emit("stop-sharing", getRoomId(), socket.id);
}

async function stopProducing(socket, roomId) {
  socket.emit("stop-producing", roomId);
}
