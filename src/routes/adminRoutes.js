// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { login, dashboardStats, getOwnMenu, updateOwnMenuItem } = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { requireMenuEditPermission } = require('../middleware/requireMenuEditPermission');

router.post('/admin/login', login);
router.get('/admin/dashboard-stats', requireAdminAuth, dashboardStats);
router.get('/admin/menu', requireAdminAuth, requireMenuEditPermission, getOwnMenu);
router.patch('/admin/menu/:itemId', requireAdminAuth, requireMenuEditPermission, updateOwnMenuItem);

module.exports = router;
