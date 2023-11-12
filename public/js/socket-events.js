import {
  createPeerConnection,
  handleAnswer,
  handleNewICECandidateMsg,
  handleOffer,
} from "./peer-connection.js";
import { adjustUIForStreaming } from "./ui-controls.js";
import { cleanUp } from "./peer-connection.js";
import { loadRooms } from "./room-control.js";

export function setupSocketListeners(stateHandler) {
  let {
    getSocket,
    getRoomId,
    getIsSharing,
    updateIsSharing,
    getOtherUsers,
    updateOtherUsers,
    getPeerConnections,
    updatePeerConnections,
    getSharerId,
    getRemoteStream,
  } = stateHandler;

  getSocket().on("error", (error) => {
    console.error("Socket error", error);
  })

  getSocket().on("connect", async () => {
    try {
      console.log("Connected to socket server");
      getSocket().emit("join-room", getRoomId(), getSocket().id);

      Object.keys(getPeerConnections()).forEach((userId) => {
        getPeerConnections()[userId].close();
        updatePeerConnections(userId, null);
      });

      await loadRooms();
    } catch (error) {
      console.error("Error during socket connect event", error);
    }
  });

  getSocket().on("new-user-joined", async (newUserId) => {
    console.log("new-user-joined", newUserId);
    if (getIsSharing()) {
      try {
        const peerConnection = await createPeerConnection(
          newUserId,
          getSocket(),
          getRoomId()
        );

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        updatePeerConnections(newUserId, peerConnection);
        getSocket().emit("offer", getRoomId(), newUserId, offer);
      } catch (error) {
        console.error("Error during new-user-joined event", error);
      }
    }
  });

  getSocket().on("new-room-created", async () => {
    console.log("New room created");
    await loadRooms();
  });

  getSocket().on("new-user", async (newUserId) => {
    console.log("new-user", newUserId);
    if (!getOtherUsers().includes(newUserId)) {
      updateOtherUsers([...getOtherUsers(), newUserId]);
    }

    // If the local user is sharing the screen, immediately start sharing with the new user
    const remoteStream = getRemoteStream();
    if (getIsSharing() && remoteStream) {
      console.log("Sharing screen with newly joined user", newUserId);
      try {
        let peerConnection = await createPeerConnection(
          newUserId,
          getSocket(),
          getRoomId()
        );

        // Add tracks to the peer connection
        remoteStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, remoteStream);
        });

        updatePeerConnections(newUserId, peerConnection);
        // Create an offer for the new user
        console.log("Creating an offer for the new user", newUserId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        getSocket().emit(
          "offer",
          getRoomId(),
          newUserId,
          peerConnection.localDescription
        );
      } catch (error) {
        console.error("Error creating an offer for the new user", error);
      }
    }
  });

  getSocket().on("start-sharing", () => {
    console.log("start-sharing");
    updateIsSharing(true);
    adjustUIForStreaming(true, getSocket(), getSharerId());
  });

  getSocket().on("stop-sharing", () => {
    console.log("stop-sharing");
    updateIsSharing(true);
    adjustUIForStreaming(false, getSocket(), getSharerId());
  });

  getSocket().on("offer", async (userId, offer) => {
    console.log("offer sent to", userId);
    await handleOffer(
      userId,
      offer,
      getPeerConnections(),
      getSocket(),
      getRoomId()
    );
  });

  getSocket().on("answer", async (userId, answer) => {
    console.log("answer sent to", userId);
    await handleAnswer(userId, getPeerConnections(), answer);
  });

  getSocket().on("ice-candidate", async (userId, candidate) => {
    console.log("ice-candidate sent to", userId);
    await handleNewICECandidateMsg(userId, getPeerConnections(), candidate);
  });

  getSocket().on("other-users", (otherUsers) => {
    console.log("other-users", otherUsers);
    updateOtherUsers(otherUsers);
  });

  getSocket().on("user-left", (userId) => {
    try {
      const currentPeerConnections = getPeerConnections();
      console.log("user left", userId);
      console.log("currentPeerConnections", currentPeerConnections);
      const peerConnection = currentPeerConnections[userId];
      if (peerConnection) {
        peerConnection.close();
      }
      updatePeerConnections(userId);
      console.log("peerConnections after user left", getPeerConnections());
      const updatedOtherUsers = getOtherUsers().filter((id) => id !== userId);
      updateOtherUsers(updatedOtherUsers);
      console.log("otherUsers after user left", getOtherUsers());
    } catch (error) {
      console.error("Error during user-left event", error);
    }
  });

  window.onbeforeunload = () => {
    console.log("onbeforeunload");
    try {
      const socket = getSocket();
      cleanUp(getPeerConnections(), socket, getRoomId());
    } catch (error) {
      console.error("Error during window unload", error);
    }
  };
}
