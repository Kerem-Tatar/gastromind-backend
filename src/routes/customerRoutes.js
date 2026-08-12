// src/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const { getRestaurantInfo, getMenu, askAi, recommendDish, submitFeedback } = require('../controllers/customerController');

router.get('/restaurant/:slug', getRestaurantInfo);
router.get('/menu/:slug', getMenu);
router.post('/ask-ai', askAi);
router.post('/recommend-dish', recommendDish);
router.post('/submit-feedback', submitFeedback);

module.exports = router;
