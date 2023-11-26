import { adjustUIForStreaming } from "./ui-controls.js";
import { loadRooms } from "./room-control.js";

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

    console.log('[start-sharing] getSocket:', getSocket());
    console.log('[start-sharing] sharerId:', sharerId);

    adjustUIForStreaming(true, getSocket(), getSharerId());
  });

  getSocket().on("stop-sharing", () => {
    console.log("stop-sharing");
    updateIsSharing(false);
    adjustUIForStreaming(false, getSocket(), getSharerId());
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
      // socket cleanup?
    } catch (error) {
      console.error("Error during window unload", error);
    }
  };
}
