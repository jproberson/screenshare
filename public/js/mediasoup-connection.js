import * as mediasoupClient from 'mediasoup-client';

export async function createProducerTransport(roomId, userId, getSocket) {
  return new Promise((resolve, reject) => {
    getSocket().emit(
      "create-producer-transport",
      roomId,
      userId,
      (response) => {
        console.log("Received response:", response);
        if (response.error) {
          console.error("Error in create-producer-transport:", response.error);
          reject(response.error);
        } else if (!response.params || !response.params.dtlsParameters) {
          console.error(
            "Invalid response from create-producer-transport:",
            response
          );
          reject(new Error("Invalid response from server"));
        } else {
          resolve(response.params);
        }
      }
    );
  });
}

export async function connectProducerTransport(
  roomId,
  userId,
  dtlsParameters,
  getSocket
) {
  console.log("connectProducerTransport", roomId, userId, dtlsParameters);
  return new Promise((resolve, reject) => {
    getSocket().emit(
      "connect-producer-transport",
      roomId,
      userId,
      dtlsParameters,
      (response) => {
        if (response.error) {
          console.error("Error in connect-producer-transport:", response.error);
          reject(response.error);
        } else {
          resolve();
        }
      }
    );
  });
}

export async function produce(roomId, userId, kind, rtpParameters, getSocket) {
  return new Promise((resolve, reject) => {
    getSocket().emit(
      "produce",
      roomId,
      userId,
      kind,
      rtpParameters,
      (response) => {
        if (response.error) {
          console.error("Error in produce:", response.error);
          reject(response.error);
        } else {
          resolve(response.id);
        }
      }
    );
  });
}

export async function startProducingMedia(
  roomId,
  userId,
  mediaStream,
  getSocket,
  getDevice
) {
  try {
    const transportInfo = await createProducerTransport(
      roomId,
      userId,
      getSocket
    );
    const dtlsParameters = transportInfo.dtlsParameters;

    await connectProducerTransport(roomId, userId, dtlsParameters, getSocket);

    const promises = mediaStream.getTracks().map(async (track) => {
      const kind = track.kind;
      const rtpParameters = await getRtpParameters(track, getDevice());

      const producerId = await produce(
        roomId,
        userId,
        kind,
        rtpParameters,
        getSocket
      );
      console.log(`Produced ${kind} with ID: ${producerId}`);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error in producing media:", error);
  }
}

async function getRtpParameters(track, device) {
  let rtpCapabilities = device.rtpCapabilities;

  let rtpParameters = {
    codecs: [],
    headerExtensions: [],
  };

  rtpCapabilities.codecs.forEach((codec) => {
    if (codec.kind === track.kind) {
      rtpParameters.codecs.push({
        mimeType: codec.mimeType,
        clockRate: codec.clockRate,
        payloadType: codec.preferredPayloadType,
        channels: codec.channels ? codec.channels : undefined,
      });
    }
  });

  rtpCapabilities.headerExtensions.forEach((extension) => {
    if (extension.kind === track.kind) {
      rtpParameters.headerExtensions.push({
        uri: extension.uri,
        id: extension.preferredId,
      });
    }
  });
  console.log("Generated RTP Parameters:", rtpParameters);

  return rtpParameters;
}


export async function initializeDevice(socket, updateDevice) {
  try {
    const device = new mediasoupClient.Device();
    const routerRtpCapabilities = await fetchRouterRtpCapabilities(socket);
    await device.load({ routerRtpCapabilities });

    updateDevice(device);
  } catch (error) {
    console.error("Could not initialize mediasoup device:", error);
  }
}

async function fetchRouterRtpCapabilities(socket) {
  return new Promise((resolve, reject) => {
    socket.emit("getRouterRtpCapabilities", (response) => {
      if (response.error) {
        console.error("Error fetching RTP Capabilities:", response.error);
        reject(response.error);
      } else {
        resolve(response.rtpCapabilities);
      }
    });
  });
}
