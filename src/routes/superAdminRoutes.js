// src/routes/superAdminRoutes.js
const express = require('express');
const router = express.Router();
const {
    createRestaurant,
    listRestaurants,
    getRestaurant,
    updateOwnerCredentials,
    addCategory,
    deleteCategory,
    getRestaurantMenu,
    addMenuItem,
    updateMenuItemPhoto,
    deleteMenuItem
} = require('../controllers/superAdminController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const { upload } = require('../middleware/upload');

router.use('/superadmin', requireAdminAuth, requireSuperAdmin);

router.get('/superadmin/restaurants', listRestaurants);
router.post('/superadmin/restaurants', createRestaurant);
router.get('/superadmin/restaurants/:id', getRestaurant);
router.patch('/superadmin/restaurants/:id/owner', updateOwnerCredentials);
router.post('/superadmin/restaurants/:id/categories', addCategory);
router.delete('/superadmin/restaurants/:id/categories/:categoryId', deleteCategory);
router.get('/superadmin/restaurants/:id/menu', getRestaurantMenu);
router.post('/superadmin/restaurants/:id/menu', upload.single('image'), addMenuItem);
router.patch('/superadmin/restaurants/:id/menu/:itemId/photo', upload.single('image'), updateMenuItemPhoto);
router.delete('/superadmin/restaurants/:id/menu/:itemId', deleteMenuItem);

module.exports = router;
