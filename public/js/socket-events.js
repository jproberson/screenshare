import { adjustUIForStreaming } from "./ui-controls.js";
import { loadRooms } from "./room-control.js";
import {
  createWebRtcTransport,
  connectTransport,
  consume,
  produce,
} from "./mediasoup-client.js";

export function setupSocketListeners(stateHandler) {
  let {
    getSocket,
    getRoomId,
    getIsSharing,
    updateIsSharing,
    getOtherUsers,
    updateOtherUsers,
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
    updateOtherUsers([...getOtherUsers(), newUserId]);

    if (getIsSharing()) {
      console.log("Sharing screen with newly joined user", newUserId);
      try {
        const { transport, params } = await createWebRtcTransport(
          getSocket(),
          getRoomId()
        );
        await connectTransport(
          getSocket(),
          getRoomId(),
          transport.id,
          params.dtlsParameters
        );
        const producer = await produce(
          getSocket(),
          getRoomId(),
          transport.id,
          getRemoteStream()
        );

        // Handle the producer logic here
      } catch (error) {
        console.error("Error in sharing screen with new user", error);
      }
    }
  });

  getSocket().on("start-sharing", (sharerId) => {
    console.log("start-sharing received");
    updateIsSharing(true);
    updateSharerId(sharerId);
    adjustUIForStreaming(true, getSocket(), getSharerId());
  });

  getSocket().on("stop-sharing", () => {
    console.log("stop-sharing");
    updateIsSharing(false);
    adjustUIForStreaming(false, getSocket(), getSharerId());
  });

  // Add event listeners for mediasoup-specific events
  getSocket().on("producer-transport-created", async (params) => {
    // Handle producer transport creation logic
  });

  getSocket().on("consumer-transport-created", async (params) => {
    // Handle consumer transport creation logic
  });

  getSocket().on("consume", async (producerId) => {
    // Handle consuming a remote producer
    const device = getDevice();
    if (!device.canProduce("video")) {
      console.error("Cannot consume video");
      return;
    }
    const { id, kind, rtpParameters } = await consume(
      getSocket(),
      getRoomId(),
      producerId,
      device.rtpCapabilities
    );
    // Handle the consumer logic here
  });

  getSocket().on("other-users", (otherUsers) => {
    console.log("other-users", otherUsers);
    updateOtherUsers(otherUsers);
  });

  getSocket().on("user-left", (userId) => {
    try {
      console.log("user left", userId);      
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
      // cleanUp(getPeerConnections(), socket, getRoomId());
    } catch (error) {
      console.error("Error during window unload", error);
    }
  };
}
