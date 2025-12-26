// src/hooks/usePeerConnection.tsx
import { useEffect, useRef, useState, useCallback } from 'react';

type MessageHandler = (msg: any) => void;

export interface PeerOptions {
  signalingUrl: string; // wss://...
  roomId: string;
  isInitiator?: boolean;
  turnServers?: RTCIceServer[]; // TURN/STUN list
  onMessage?: MessageHandler;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
}

export function usePeerConnection({
  signalingUrl,
  roomId,
  isInitiator = false,
  turnServers = [{ urls: 'stun:stun.l.google.com:19302' }],
  onMessage,
  onConnectionState,
}: PeerOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [remoteDescSet, setRemoteDescSet] = useState(false);

  useEffect(() => {
    // open signaling WS
    const ws = new WebSocket(signalingUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', room: roomId }));
      // If initiator, we'll create RTCPeerConnection and datachannel
      if (isInitiator) {
        createPeerConnection();
      }
    };

    ws.onmessage = async (ev) => {
      const payload = JSON.parse(ev.data);
      if (payload.type === 'offer') {
        await handleOffer(payload.data);
      } else if (payload.type === 'answer') {
        await handleAnswer(payload.data);
      } else if (payload.type === 'ice') {
        await handleRemoteIce(payload.data);
      }
    };

    ws.onclose = () => {
      console.log('Signaling closed');
    };

    return () => {
      ws.close();
      closePc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalingUrl, roomId]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: turnServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ice', room: roomId, data: e.candidate }));
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnected(state === 'connected' || state === 'completed');
      onConnectionState?.(state);
    };

    // DataChannel for messages & file chunks
    if (isInitiator) {
      const dc = pc.createDataChannel('verytippers-data', { negotiated: false });
      setupDataChannel(dc);
      dcRef.current = dc;
    } else {
      pc.ondatachannel = (e) => {
        dcRef.current = e.channel;
        setupDataChannel(e.channel);
      };
    }

    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiator, roomId, JSON.stringify(turnServers)]);

  async function setupDataChannel(dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';

    dc.onopen = () => console.log('DataChannel open');
    dc.onclose = () => console.log('DataChannel closed');
    dc.onerror = (err) => console.error('DC error', err);

    dc.onmessage = (ev) => {
      try {
        // Try parse JSON text messages; if binary, handle chunk protocol
        if (typeof ev.data === 'string') {
          const json = JSON.parse(ev.data);
          onMessage?.(json);
          return;
        }
        // handle ArrayBuffer (file chunk)
        // Implement your chunk reassembly logic
        onMessage?.({ type: 'binary', data: ev.data });
      } catch (err) {
        console.error('failed to parse DC message', err);
      }
    };
  }

  async function createOffer() {
    const pc = pcRef.current ?? createPeerConnection();
    // create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    // send offer via signaling
    wsRef.current?.send(JSON.stringify({ type: 'offer', room: roomId, data: offer }));
  }

  async function handleOffer(offer: RTCSessionDescriptionInit) {
    const pc = pcRef.current ?? createPeerConnection();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    wsRef.current?.send(JSON.stringify({ type: 'answer', room: roomId, data: answer }));
    setRemoteDescSet(true);
  }

  async function handleAnswer(answer: RTCSessionDescriptionInit) {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(answer);
    setRemoteDescSet(true);
  }

  async function handleRemoteIce(candidate: RTCIceCandidateInit) {
    try {
      const pc = pcRef.current ?? createPeerConnection();
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.error('addIceCandidate error', err);
    }
  }

  function sendJson(msg: any) {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') {
      throw new Error('datachannel not open');
    }
    dc.send(JSON.stringify(msg));
  }

  // Simple file chunk sender
  async function sendFile(file: File, chunkSize = 64 * 1024) {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') throw new Error('DC closed');
    const reader = file.stream().getReader();
    // send metadata first
    sendJson({ type: 'file-meta', name: file.name, size: file.size, mime: file.type });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      dc.send(value.buffer);
    }
    sendJson({ type: 'file-end' });
  }

  function closePc() {
    try {
      dcRef.current?.close();
      pcRef.current?.close();
    } catch (e) { /* no-op */ }
    pcRef.current = null;
    dcRef.current = null;
  }

  return {
    connected,
    createOffer,
    sendJson,
    sendFile,
    closePc,
  };
}

