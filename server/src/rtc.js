import jwt from 'jsonwebtoken';
import { config } from './config.js';

let AccessToken;
try {
  const sdk = await import('livekit-server-sdk');
  AccessToken = sdk.AccessToken;
} catch {
  // livekit-server-sdk not yet installed, jsonwebtoken fallback will be used
}

/**
 * Generates configuration for free standard WebRTC room with Google STUN servers.
 * @param {string} channel - Room/channel name
 * @param {string|number} publicId - User's 8-digit public ID
 * @param {boolean} isPublisher - True for host / audio seat, false for viewer
 * @param {string} [name] - User display name
 */
export function rtcToken(channel, publicId, isPublisher, name = '') {
  const identity = String(publicId);
  const uidNum = Number(publicId) || 0;

  // Free standard WebRTC with public Google STUN servers (zero cost, zero keys required)
  return {
    provider: 'webrtc',
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    channel,
    identity,
    uid: uidNum,
    isPublisher: Boolean(isPublisher),
    demo: false,
  };
}
