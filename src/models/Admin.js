// src/models/Admin.js
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    role: { type: String, enum: ['owner', 'superadmin'], default: 'owner' },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', AdminSchema);
