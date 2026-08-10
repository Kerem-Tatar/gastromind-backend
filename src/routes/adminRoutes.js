// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { login, dashboardStats } = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/authMiddleware');

router.post('/admin/login', login);
router.get('/admin/dashboard-stats', requireAdminAuth, dashboardStats);

module.exports = router;
