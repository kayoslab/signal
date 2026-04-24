export interface WebRTCSignals {
  localIPs: string[];
  webrtcSupported: boolean;
}

const UNAVAILABLE_RESULT: WebRTCSignals = {
  localIPs: [],
  webrtcSupported: false,
};

/**
 * Detects local IP addresses via RTCPeerConnection ICE candidate gathering.
 *
 * Uses empty iceServers (no STUN/TURN) — fully local, no network traffic.
 * This demonstrates the WebRTC local IP leak vulnerability that trackers exploit.
 */
export async function collectWebRTCSignals(): Promise<WebRTCSignals> {
  try {
    const RTCPeer =
      (globalThis as unknown as { RTCPeerConnection?: typeof RTCPeerConnection })
        .RTCPeerConnection ??
      (globalThis as unknown as { webkitRTCPeerConnection?: typeof RTCPeerConnection })
        .webkitRTCPeerConnection;

    if (!RTCPeer) return UNAVAILABLE_RESULT;

    const pc = new RTCPeer({ iceServers: [] });
    const ips = new Set<string>();

    const gatheringDone = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        const candidate = event.candidate.candidate;
        // Extract IP from ICE candidate string
        const ipMatch = candidate.match(
          /(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}/i,
        );
        if (ipMatch) {
          const ip = ipMatch[0];
          // Filter out mDNS obfuscated candidates
          if (!ip.endsWith('.local')) {
            ips.add(ip);
          }
        }
      };
    });

    // Create a data channel to trigger candidate gathering
    pc.createDataChannel('');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await gatheringDone;
    pc.close();

    return {
      localIPs: Array.from(ips),
      webrtcSupported: true,
    };
  } catch {
    return UNAVAILABLE_RESULT;
  }
}
