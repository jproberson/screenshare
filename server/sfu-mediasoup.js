const mediasoup = require("mediasoup");
const logger = require("./logger");

let worker;
let router;
let transports = new Map();

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on("died", () => {
    logger.error(
      "mediasoup worker died, exiting in 2 seconds... [pid:%d]",
      worker.pid
    );
    setTimeout(() => process.exit(1), 2000);
  });

  const mediaCodecs = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {
        "x-google-start-bitrate": 1000,
      },
    }
  ];

  router = await worker.createRouter({ mediaCodecs });
}

async function createWebRtcTransport() {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  logger.info(`Transport created: ${transport.id}`);
  transports.set(transport.id, transport);

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

async function connectTransport(transportId, dtlsParameters) {
  logger.info(`Connecting transport: ${transportId}`);

  const transport = transports.get(transportId);

  logger.info('transport found:', transport)
  if (!transport) {
    logger.error(`Transport not found: ${transportId} when connecting`);
    throw new Error("Transport not found");
  }

  await transport.connect({ dtlsParameters });
}

async function createProducer(transportId, kind, rtpParameters) {
  const transport = transports.get(transportId);
  if (!transport) {
    throw new Error(`Transport not found: ${transportId} when creating producer`);
  }
  const producer = await transport.produce({ kind, rtpParameters });
  return producer.id;
}

async function createConsumer(producerId, rtpCapabilities, transportId) {
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    logger.error("Cannot consume");
    return;
  }

  const transport = transports.get(transportId); // Retrieve the transport
  if (!transport) {
    throw new Error(`Transport not found: ${transportId} when creating consumer`);
  }

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  return {
    id: consumer.id,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
    producerId,
  };
}

module.exports = {
  createWorker,
  createWebRtcTransport,
  connectTransport,
  createProducer,
  createConsumer,
  getRouter: () => router,
};
