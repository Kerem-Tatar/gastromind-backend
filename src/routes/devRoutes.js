// src/routes/devRoutes.js
const express = require('express');
const router = express.Router();
const { createDummyRestaurant, seedFakeData } = require('../controllers/devController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

// Global demo seeder — touches data outside any single restaurant, superadmin only.
router.get('/create-dummy-restaurant', requireAdminAuth, requireSuperAdmin, createDummyRestaurant);
// Per-restaurant test data — any logged-in owner can seed their own restaurant.
router.post('/seed-fake-data', requireAdminAuth, seedFakeData);

module.exports = router;
