// scripts/createSuperAdmin.js
// One-time bootstrap: creates (or resets) the platform's superadmin account.
// Usage: node scripts/createSuperAdmin.js <username> <password>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const Admin = require('../src/models/Admin');

async function main() {
    const [, , username, password] = process.argv;
    if (!username || !password) {
        console.error('Kullanım: node scripts/createSuperAdmin.js <username> <password>');
        process.exit(1);
    }

    await connectDatabase();

    const password_hash = await bcrypt.hash(password, 10);
    const admin = await Admin.findOneAndUpdate(
        { username },
        { username, password_hash, role: 'superadmin', restaurant_id: null },
        { upsert: true, returnDocument: 'after' }
    );

    console.log(`✅ Superadmin hazır: ${admin.username}`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Hata:', err);
    process.exit(1);
});
