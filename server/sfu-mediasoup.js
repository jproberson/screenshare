const mediasoup = require("mediasoup");

let worker;
let router;

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: "warn",
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  });

  worker.on("died", () => {
    console.error(
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
    },
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

  return {
    id: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
  };
}

async function connectTransport(transportId, dtlsParameters) {
  const transport = router.getTransport(transportId);
  await transport.connect({ dtlsParameters });
}

async function createProducer(transportId, kind, rtpParameters) {
  const transport = router.getTransport(transportId);
  const producer = await transport.produce({ kind, rtpParameters });
  return producer.id;
}

async function createConsumer(producerId, rtpCapabilities, transportId) {
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    console.error("Cannot consume");
    return;
  }

  const transport = router.getTransport(transportId);
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
};
