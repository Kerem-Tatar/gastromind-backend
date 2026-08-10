// src/config/auth.js
// JWT signing secret. Admin credentials now live in the DB (see models/Admin.js),
// not in .env — see .env.example for ADMIN_JWT_SECRET.

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_JWT_SECRET) {
    console.warn('⚠️  ADMIN_JWT_SECRET .env dosyasında tanımlı değil. Admin girişi çalışmayacak.');
}

module.exports = { ADMIN_JWT_SECRET };
