// src/models/Restaurant.js
const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true },   // URL için (örn: demo-restoran)
    type: {
        type: String,
        enum: ['fine_dining', 'fast_casual', 'qsr', 'coffee_shop'],
        default: 'fast_casual'
    },
    // AI persona
    ai_config: {
        persona_name: { type: String, default: "Asistan" },
        tone: { type: String, default: "friendly" },
        priority_metrics: [{ type: String }] // ["hız", "lezzet"]
    },
    tables_count: { type: Number, default: 10 },
    // Menu categories are per-restaurant, not a global fixed list — MenuItem.category
    // values should match one of these `id`s. Frontend not wired to this yet.
    categories: [{
        id: { type: String, required: true },   // e.g. "ana_yemek" — matched against MenuItem.category
        name: { type: String, required: true },  // e.g. "Ana Yemekler" — display label
        emoji: { type: String, default: "🍽️" }
    }]
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
