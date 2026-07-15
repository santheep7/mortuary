import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Broad enough to cover phone photos/screenshots (webp/gif/bmp are
    // common from Windows Snip & Sketch, WhatsApp forwards, etc.) as well
    // as the legal/NOC document formats the release flow needs.
    const allowed = /jpeg|jpg|png|webp|gif|bmp|pdf|doc|docx|xls|xlsx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error(`"${file.originalname}" isn't a supported file type. Allowed: images (jpg, png, webp, gif, bmp) or documents (pdf, doc, xls).`));
  }
});

// multer's declarative middleware form (upload.single('x') used directly as
// router middleware) can let a fileFilter rejection turn into an unhandled
// error deep in multer/busboy's stream internals instead of a clean HTTP
// response - this wraps it in the callback form, which is the documented-safe
// way to guarantee the error is caught and turned into a normal JSON 400
// instead of a raw stack trace (or worse, an unhandled exception).
export function safeUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

export default upload;

