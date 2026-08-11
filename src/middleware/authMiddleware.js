// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { ADMIN_JWT_SECRET } = require('../config/auth');

function requireAdminAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    try {
        req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
}

module.exports = { requireAdminAuth };
