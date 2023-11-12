import { updateButtonUI, adjustUIForStreaming } from "./ui-controls.js";
import { createPeerConnection } from "./peer-connection.js";

export async function startSharing(stateHandler) {
  const {
    getSocket,
    updateRemoteStream,
    updatePeerConnections,
    updateIsSharing,
    updateSharerId,
    getRoomId,
    getOtherUsers,
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

    try {
      for (const otherUserId of getOtherUsers()) {
        try {
          let peerConnection = await createPeerConnection(
            otherUserId,
            socket,
            getRoomId()
          );

          remoteStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, remoteStream);
          });

          peerConnection.readyForNegotiation = true;

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          updatePeerConnections(otherUserId, peerConnection);
          console.log("offer sent", getRoomId(), otherUserId, offer);
          socket.emit(
            "offer",
            getRoomId(),
            otherUserId,
            peerConnection.localDescription
          );
        } catch (peerError) {
          console.error(
            `Error with peer connection for user ${otherUserId}:`,
            peerError
          );
        }
      }
    } catch (error) {
      console.error("Error starting screen sharing.", error);
      updateIsSharing(false);
      updateButtonUI(false);
      adjustUIForStreaming(false, socket, null);
      updateRemoteStream(null);
      updateSharerId(null);
      updatePeerConnections(null);
    }

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
  socket.emit("stop-sharing", getRoomId(), socket.id);
}
