/**
 * Storage service with swappable drivers.
 *
 * STORAGE_DRIVER=local      → files saved to server/uploads, served at /uploads/*
 * STORAGE_DRIVER=cloudinary → files uploaded to Cloudinary (requires CLOUDINARY_* env vars
 *                             and `npm i cloudinary`)
 *
 * The rest of the app only calls saveFile()/deleteFile() — swapping drivers
 * requires zero changes elsewhere (frontend included).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const localDriver = {
  name: 'local',
  /** @param {{buffer: Buffer, originalname: string, mimetype: string}} file */
  async save(file) {
    const ext = path.extname(file.originalname);
    const storedName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, storedName), file.buffer);
    return { storedName, url: `/uploads/${storedName}`, driver: 'local' };
  },
  async remove(storedName) {
    await fs.promises.unlink(path.join(UPLOAD_DIR, storedName)).catch(() => {});
  },
};

const cloudinaryDriver = {
  name: 'cloudinary',
  async save(file) {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: 'auto', folder: 'teamsync' }, (err, res) =>
          err ? reject(err) : resolve(res)
        )
        .end(file.buffer);
    });
    return { storedName: result.public_id, url: result.secure_url, driver: 'cloudinary' };
  },
  async remove(storedName) {
    const { v2: cloudinary } = await import('cloudinary');
    await cloudinary.uploader.destroy(storedName).catch(() => {});
  },
};

const driver = process.env.STORAGE_DRIVER === 'cloudinary' ? cloudinaryDriver : localDriver;

export const saveFile = (file) => driver.save(file);
export const deleteFile = (storedName) => driver.remove(storedName);
