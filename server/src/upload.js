import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(config.uploadsDir, { recursive: true });

const ALLOWED = /\.(png|jpe?g|webp|gif|json|svga|mp4|mp3|wav|ogg)$/i;

export const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.test(file.originalname)),
});

export const fileUrl = (f) => (f ? `/uploads/${f.filename}` : null);

// Private uploads (KYC ID photos, selfies, live snapshots): images only, stored outside the public folder.
fs.mkdirSync(config.privateDir, { recursive: true });
export const privateUpload = multer({
  storage: multer.diskStorage({
    destination: config.privateDir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(png|jpe?g|webp)$/i.test(file.mimetype)),
});
export const privatePath = (name) => {
  const safe = path.basename(String(name || ''));
  return path.join(config.privateDir, safe);
};
