import { getRoomIdFromURL } from "./utils.js";
import { startSharing, stopSharing } from "./stream.js";
import { adjustUIForStreaming } from "./ui-controls.js";
import { setupSocketListeners } from "./socket-events.js";

document.addEventListener("DOMContentLoaded", async (event) => {
  console.log("DOM fully loaded and parsed");
  const shareScreenButton = document.getElementById("share-screen-btn");
  const toggleSidebarButton = document.getElementById("toggleSidebar");
  const sidebar = document.getElementById("roomList");

  const socket = io("http://localhost:4000");
  let remoteStream = null;
  let otherUserIds = [];
  let peerConnections = {};
  let isSharing = false;
  let sharerId = null;
  const room_id = getRoomIdFromURL();

  const stateHandler = {
    getSocket: () => socket,
    getRoomId: () => room_id,
    getOtherUsers: () => otherUserIds,
    updateOtherUsers: (users) => {
      otherUserIds = users;
    },
    getIsSharing: () => isSharing,
    updateIsSharing: (sharing) => {
      isSharing = sharing;
    },
    getRemoteStream: () => remoteStream,
    updateRemoteStream: (stream) => {
      remoteStream = stream;
    },
    getPeerConnections: () => peerConnections,
    updatePeerConnections: (userId, connection) => {
      console.log("updatePeerConnections", userId, connection);
      if (connection) {
        peerConnections[userId] = connection;
      } else {
        delete peerConnections[userId];
      }

      console.log("peerConnections after updating", peerConnections);
    },
    getSharerId: () => sharerId,
    updateSharerId: (id) => {
      sharerId = id;
    },
  };

  setupSocketListeners(stateHandler);

  shareScreenButton.addEventListener("click", async () => {
    if (isSharing) {
      await stopSharing(stateHandler);
    } else {
      await startSharing(stateHandler);
    }
  });

  adjustUIForStreaming(isSharing, socket, sharerId);

  toggleSidebarButton.addEventListener("click", function () {
    if (sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
      toggleSidebarButton.textContent = '<';
    } else {
      sidebar.classList.add("open");
      toggleSidebarButton.textContent = '>';
    }
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error(
      "Unhandled rejection (promise: ",
      event.promise,
      ", reason: ",
      event.reason,
      ")."
    );
  });
});
