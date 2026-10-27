import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Load server/.env reliably regardless of current working directory
dotenv.config({ path: path.join(root, '.env') });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  // Database: leave DATABASE_URL empty to use the built-in SQLite file (development).
  databaseUrl: process.env.DATABASE_URL || '',
  sqliteFile: process.env.SQLITE_FILE || path.join(root, 'data', 'liveapp.db'),
  uploadsDir: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
  publicUrl: process.env.PUBLIC_URL || '',
  // Live video/audio: 100% Free WebSocket WebRTC (P2P Mesh + Google STUN).
  rtcProvider: process.env.RTC_PROVIDER || 'webrtc',
  // OTP: "dev" accepts code 123456; "msg91" sends a real SMS.
  otpProvider: process.env.OTP_PROVIDER || 'dev',
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
  // Payments: without Razorpay keys, recharges are credited instantly in dev mode.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpaySecret: process.env.RAZORPAY_KEY_SECRET || '',
  // Private files (KYC documents, live snapshots) are stored here and never served publicly.
  privateDir: process.env.PRIVATE_DIR || path.join(root, 'private'),
  // RazorpayX for automatic UPI payouts (optional, beta). Leave empty to pay withdrawals manually.
  razorpayxAccount: process.env.RAZORPAYX_ACCOUNT_NUMBER || '',
  // Identity verification provider for hosts: "manual" (admin reviews ID + live selfie).
  kycProvider: process.env.KYC_PROVIDER || 'manual',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  // Test shortcuts (OTP 123456, free recharges) are blocked in production unless ALLOW_DEV_MODE=1.
  devAllowed: process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_MODE === '1',
};
