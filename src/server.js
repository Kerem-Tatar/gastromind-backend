// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDatabase } = require('./config/database');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const devRoutes = require('./routes/devRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

connectDatabase();

// --- HEALTH CHECK ROUTE (IS THE SYSTEM UP?) ---
app.get('/', (req, res) => {
    res.send('🚀 GastroMind Sunucusu Çalışıyor!');
});

// --- ROUTES ---
app.use('/api', customerRoutes);
app.use('/api', adminRoutes);
app.use('/api', devRoutes);
app.use('/api', superAdminRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🔥 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
