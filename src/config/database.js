// src/config/database.js
const mongoose = require('mongoose');

// Falls back to a local database if no URI is set in .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gastromind';

function connectDatabase() {
    return mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Veritabanına Başarıyla Bağlanıldı!'))
        .catch(err => console.error('❌ Veritabanı Hatası:', err));
}

module.exports = { connectDatabase };
