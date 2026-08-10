// src/middleware/requireSuperAdmin.js
// Must run after requireAdminAuth (needs req.admin already set).
function requireSuperAdmin(req, res, next) {
    if (!req.admin || req.admin.role !== 'superadmin') {
        return res.status(403).json({ error: "Bu işlem için superadmin yetkisi gerekli" });
    }
    next();
}

module.exports = { requireSuperAdmin };
