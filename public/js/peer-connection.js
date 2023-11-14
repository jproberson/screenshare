  import { adjustUIForStreaming } from "./ui-controls.js";

  export async function createPeerConnection(otherUserId, socket, room_id) {
    let remoteVideo = document.getElementById("remote-video");
    let peerConnection = new RTCPeerConnection();

    if (!peerConnection) {
      console.error("Peer connection is not initialized for user " + otherUserId);
      return;
    }

    peerConnection.onnegotiationneeded = async () => {
      console.log("[onnegotiationneeded] peerConnection", peerConnection);
      if (!peerConnection.readyForNegotiation) {
        console.log("Not ready for negotiation, continue");
        return;
      }

      console.log(
        `[PeerConnection] Negotiation needed event for user ${otherUserId}`
      );

      try {
        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", room_id, otherUserId, offer);
      } catch (err) {
        console.error(`Failed to renegotiate for user ${otherUserId}`, err);
      }
    };

    peerConnection.onicecandidate = async (event) => {
      console.log(
        `[PeerConnection] ICE candidate event for user ${otherUserId}`,
        event.candidate
      );
      const { candidate } = event;
      if (candidate) {
        await socket.emit("ice-candidate", room_id, otherUserId, candidate);
      }
    };

    peerConnection.onconnectionstatechange = async (event) => {
      console.log(
        `[PeerConnection] Connection state change event for user ${otherUserId}`,
        event
      );
      if (peerConnection.connectionState === "failed") {
        console.error(`Connection failed for user: ${otherUserId}`);
      }
    };

    peerConnection.ontrack = async (event) => {
      console.log(
        `[PeerConnection] Track event received from user ${otherUserId}`
      );
      const { streams } = event;

      if (streams.length > 0) {
        remoteVideo.srcObject = streams[0];
        adjustUIForStreaming(true, socket, otherUserId);
      }
    };

    remoteVideo.onerror = (event) => {
      console.error("Video error for user " + otherUserId + ":", event.message);
    };

    return peerConnection;
  }

  export async function handleOffer(
    userId,
    offer,
    peerConnections,
    socket,
    room_id
  ) {
    try {
      const peerConnection = await createPeerConnection(userId, socket, room_id);

      peerConnections[userId] = peerConnection;

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("[PeerConnection] handleOffer", peerConnection);

      console.log("Sending answer to server");
      socket.emit("answer", room_id, userId, peerConnection.localDescription);
    } catch (error) {
      console.error(`Error handling offer from userId: ${userId}`, error);
    }
  }

  export async function handleAnswer(userId, peerConnections, answer) {
    console.log("[PeerConnection] handleAnswer", peerConnections);
    try {
      const peerConnection = peerConnections[userId];
      console.log("[PeerConnection] handleAnswer", peerConnection);
      if (
        !peerConnection ||
        peerConnection.signalingState !== "have-local-offer"
      ) {
        console.error(
          `PeerConnection not ready or not in correct state for user: ${userId}`
        );
        return;
      }
      console.log(
        `[PeerConnection] Setting remote description for user ${userId}`
      );
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      return peerConnection;
    } catch (error) {
      console.error(`Error handling answer from userId: ${userId}`, error);
    }
  }

  export async function handleNewICECandidateMsg(
    userId,
    peerConnections,
    candidate
  ) {
    try {
      const peerConnection = peerConnections[userId];
      if (!peerConnection) {
        console.error(`No peer connection found for user: ${userId}`);
        return;
      }
      console.log("[PeerConnection] handleNewICECandidateMsg", peerConnection);
      return await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Error adding ICE candidate for userId: ${userId}`, error);
    }
  }

  export function cleanUp(peerConnections, socket, room_id) {
    console.log("peerConnections during cleanup:", peerConnections);
    console.log("Closing all peer connections");
    for (let userId in peerConnections) {
      if (peerConnections.hasOwnProperty(userId)) {
        peerConnections[userId].close();
        delete peerConnections[userId];
      }
    }
    console.log("peerConnections after cleanup:", peerConnections);
    socket.emit("user-left", room_id, socket.id);
  }
