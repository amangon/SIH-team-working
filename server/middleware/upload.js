import multer from 'multer';

const ALLOWED = [
  'image/', 'video/', 'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/x-rar-compressed', 'application/vnd.rar', 'application/msword',
  'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint', 'text/', 'application/json', 'application/javascript',
  'application/octet-stream',
];

export const upload = multer({
  storage: multer.memoryStorage(), // buffer → storage service decides where it lands
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.some((p) => file.mimetype.startsWith(p))) return cb(null, true);
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});
