// src/middleware/requireMenuEditPermission.js
// Must run after requireAdminAuth. Gates owner-facing menu-content editing behind a
// per-restaurant flag that only superadmin can flip (Restaurant.owner_can_edit_menu_content).
const Restaurant = require('../models/Restaurant');

async function requireMenuEditPermission(req, res, next) {
    if (!req.admin.restaurant_id) {
        return res.status(400).json({ error: "Bu hesap bir restorana bağlı değil" });
    }

    try {
        const restaurant = await Restaurant.findById(req.admin.restaurant_id);
        if (!restaurant || !restaurant.owner_can_edit_menu_content) {
            return res.status(403).json({ error: "Menü içeriğini düzenleme yetkin yok. Bunu senin için platform yöneticisi açabilir." });
        }
        next();
    } catch (error) {
        console.error("Yetki Kontrol Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

module.exports = { requireMenuEditPermission };
