﻿# Screenshare - Not currently working but the goal of this project is to learn how to screen share utilizing webrtc.

The concepts of offer, answer, and ICE candidate are crucial in the WebRTC (Web Real-Time Communication) protocol, which enables direct peer-to-peer communication for applications like video/audio streaming, file sharing, and real-time data channels. Let's break down these concepts:

1. Offer and Answer
In WebRTC, two peers establish a connection using a process called signaling. The signaling process is used to exchange metadata to coordinate communication and manage sessions. This is where the offer and answer come into play.

Offer:
The offer is created by the initiator (the peer starting the communication). It's a Session Description Protocol (SDP) message that contains information about the initiator's media capabilities, such as supported codecs, formats, and other media parameters.
The offer also includes information about any constraints or preferences, like whether video or audio is required, resolution preferences, etc.

Answer:
After receiving the offer, the other peer (the recipient) responds with an answer.
The answer is also an SDP message. It contains the recipient's media capabilities and indicates which of the offered capabilities and options it can support and agrees to use.
This ensures that both peers agree on the formats and settings they will use for the communication.
The offer/answer mechanism allows both peers to understand and agree upon the capabilities and parameters of their communication session. It's important to note that SDP itself doesn't transmit any media; it's purely for negotiation and agreement of session parameters.

2. ICE Candidate
ICE (Interactive Connectivity Establishment) is a framework used to overcome the complexities of real-world networking. Most devices are behind NATs (Network Address Translators) or firewalls, which makes it challenging to establish peer-to-peer connections.

ICE Candidate:
An ICE candidate represents a method for connecting to a peer. It includes potential IP addresses and ports (endpoints) that the other peer can use to establish a connection.
These candidates can be:
Host candidates: Direct addresses of the device.
Reflexive candidates: Public addresses assigned by a NAT, discovered using STUN (Session Traversal Utilities for NAT) servers.
Relay candidates: Addresses from TURN (Traversal Using Relays around NAT) servers, which relay data if direct (peer-to-peer) communication fails.
Process:
Each peer gathers ICE candidates and sends them to the other peer through the signaling channel.
The peers then attempt to establish a connection starting with the most direct method (host candidates) and proceeding to more indirect methods (reflexive and relay) if necessary.
Once a pair of ICE candidates successfully establishes a connection, this pair is used for the communication.

Summary
In summary, the offer/answer mechanism in WebRTC is used to agree on the media parameters for communication, while ICE candidates are used to figure out the best way to establish and maintain the peer-to-peer connection through various network barriers. This combination allows WebRTC to enable real-time communication directly between browsers or devices in a wide range of network environments.

EXAMPLE

Preparing for Connection
Both Person A and Person B are connected to a web application that uses WebRTC for screen sharing.
They are both in the same virtual "room" in the application. This room concept is typically managed by the server or a signaling mechanism, not by WebRTC itself.
2. Person A Starts Screen Sharing (Offer)
Person A (Initiator):
Decides to share their screen.
Initiates the WebRTC process by creating an "offer". This offer is an SDP (Session Description Protocol) message which describes Person A’s media capabilities (in this case, the ability to share a screen).
The offer includes information about the screen sharing stream (like video codecs, resolution).
Person A's browser also starts gathering ICE candidates. These are potential ways (network paths) to connect with Person B.
3. Signaling to Person B
Server/Signaling Channel:
Person A sends this offer, along with any ICE candidates it has gathered so far, to the server.
The server then forwards this offer and ICE candidates to Person B.
4. Person B Receives the Offer (Answer)
Person B (Receiver):
Receives the offer from Person A. Person B's system examines the offer to understand Person A’s screen sharing capabilities and parameters.
Person B's browser also begins gathering its own ICE candidates for the return path back to Person A.
Person B then creates an "answer", which is another SDP message. This answer acknowledges the offer and confirms the agreed-upon methods and parameters for the screen sharing.
The answer might also include information about Person B's capabilities, like receiving video streams.
5. Establishing the Connection
Exchange of ICE Candidates:
Along with the answer, Person B sends back their gathered ICE candidates to Person A via the server.
Both parties now have each other's ICE candidates. Their browsers begin the ICE process, trying each candidate in turn to establish the best possible connection for the screen sharing.
6. Successful Connection and Screen Sharing
Screen Sharing Begins:
Once a pair of ICE candidates successfully creates a connection between Person A and Person B, the screen sharing starts.
Person A’s screen is captured, encoded, and sent across this connection.
Person B receives this stream, decodes it, and displays it on their screen.

Summary
In this example, the offer/answer mechanism is used for setting up the agreement on how screen sharing will be conducted (resolutions, codecs, etc.), while the ICE candidates are used for figuring out the best way to establish the actual peer-to-peer network connection between Person A and Person B. Once this is all set up, Person A can seamlessly share their screen with Person B.
