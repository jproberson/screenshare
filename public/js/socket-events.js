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
    addPeerConnection,
    removePeerConnection,
    getSharerId,
    getRemoteStream,
    updateSharerId,
  } = stateHandler;

  getSocket().on("error", (error) => {
    console.error("Socket error", error);
  });

  getSocket().on("create-consumer-transport", async (callback) => {
    try {
      socket.emit(
        "create-consumer-transport",
        getRoomId(),
        (err, transportParams) => {
          if (err) {
            console.error("Error creating consumer transport:", err);
            callback(err);
          } else {
            callback(null, transportParams);
          }
        }
      );
    } catch (error) {
      console.error("Error in create-consumer-transport:", error);
      callback(error);
    }
  });

  getSocket().on(
    "connect-consumer-transport",
    async (dtlsParameters, callback) => {
      try {
        socket.emit(
          "connect-consumer-transport",
          getRoomId(),
          dtlsParameters,
          (err) => {
            if (err) {
              console.error("Error connecting consumer transport:", err);
              callback(err);
            } else {
              callback(null);
            }
          }
        );
      } catch (error) {
        console.error("Error in connect-consumer-transport:", error);
        callback(error);
      }
    }
  );

  getSocket().on("consume", async (producerId, rtpCapabilities, callback) => {
    try {
      socket.emit(
        "consume",
        getRoomId(),
        getUserId(),
        producerId,
        rtpCapabilities,
        (response) => {
          if (response.error) {
            console.error("Error consuming producer:", response.error);
            callback(new Error(response.error));
          } else {
            callback(null, response);
          }
        }
      );
    } catch (error) {
      console.error("Error in consume event:", error);
      callback(error);
    }
  });

  getSocket().on("connect", async () => {
    try {
      console.log(`Socket connected to ${getSocket().id}`);
      console.log("Clearing any leftover connections");
      Object.keys(getPeerConnections()).forEach((userId) => {
        getPeerConnections()[userId].close();
        removePeerConnection(userId);
      });

      getSocket().emit("join-room", getRoomId(), getSocket().id);

      await loadRooms();
    } catch (error) {
      console.error("Error during socket connect event", error);
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
    const remoteStream = getRemoteStream();
    if (remoteStream)
      console.log("remote stream found for new user", newUserId);
    if (getIsSharing() && remoteStream) {
      console.log("Sharing screen with newly joined user", newUserId);
      try {
        let peerConnection = await createPeerConnection(
          newUserId,
          getSocket(),
          getRoomId()
        );

        remoteStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, remoteStream);
        });

        addPeerConnection(newUserId, peerConnection);
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

  getSocket().on("start-sharing", (sharerId) => {
    console.log("start-sharing recieved");
    updateIsSharing(true);
    updateSharerId(sharerId);

    console.log(
      "adjustUIForStreaming",
      "\nisSharing",
      getIsSharing(),
      "\nsocketId",
      getSocket().id,
      "\nsharerId",
      getSharerId()
    );
    adjustUIForStreaming(true, getSocket(), getSharerId());
  });

  getSocket().on("stop-sharing", () => {
    console.log("stop-sharing");
    updateIsSharing(true);
    adjustUIForStreaming(false, getSocket(), getSharerId());
  });

  getSocket().on("offer", async (userId, offer) => {
    console.log("offer sent from", userId);
    await handleOffer(
      userId,
      offer,
      getPeerConnections(),
      getSocket(),
      getRoomId()
    );
  });

  getSocket().on("answer", async (userId, answer) => {
    console.log("answer sent from", userId);
    const peerConnection = await handleAnswer(
      userId,
      getPeerConnections(),
      answer
    );

    addPeerConnection(userId, peerConnection);
  });

  getSocket().on("ice-candidate", async (userId, candidate) => {
    console.log("ice-candidate sent to", userId);
    const peerConnection = await handleNewICECandidateMsg(
      userId,
      getPeerConnections(),
      candidate
    );

    addPeerConnection(userId, peerConnection);
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

      removePeerConnection(userId);
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
