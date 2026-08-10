// src/middleware/upload.js
const multer = require('multer');

// Memory storage — we forward the buffer straight to Cloudinary, never touch disk
// (important on Render: local disk isn't persistent between deploys anyway).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Sadece resim dosyaları yüklenebilir'));
        }
        cb(null, true);
    }
});

module.exports = { upload };
