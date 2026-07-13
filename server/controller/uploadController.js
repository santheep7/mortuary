import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function uploadNoc(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export function uploadMultiple(req, res) {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files uploaded' });

    const uploadedFiles = req.files.map(file => ({
      filename:     file.filename,
      originalName: file.originalname,
      path:         `/uploads/${file.filename}`,
      size:         file.size,
      mimetype:     file.mimetype
    }));

    res.json({ message: 'Files uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
}

export function uploadSingle(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    res.json({
      message: 'File uploaded successfully',
      file: {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        path:         `/uploads/${req.file.filename}`,
        size:         req.file.size,
        mimetype:     req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
}

export function listUploads(req, res) {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) return res.json({ files: [] });

    const files = fs.readdirSync(uploadDir).map(filename => {
      const stats = fs.statSync(path.join(uploadDir, filename));
      return { filename, path: `/uploads/${filename}`, size: stats.size, createdAt: stats.birthtime };
    });

    res.json({ files });
  } catch (error) {
    console.error('Error reading uploads:', error);
    res.status(500).json({ error: error.message });
  }
}
