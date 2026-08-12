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
    // values should match one of these `id`s. Consumed by the customer-facing app.
    categories: [{
        id: { type: String, required: true },   // e.g. "ana_yemek" — matched against MenuItem.category
        name: { type: String, required: true },  // e.g. "Ana Yemekler" — display label
        icon: { type: String, default: "UtensilsCrossed" } // lucide-react icon name, see ICON_OPTIONS
    }],
    // Restaurant-specific look & feel. Set from the superadmin panel, consumed by the
    // customer-facing app via GET /api/restaurant/:slug.
    branding: {
        primary_color: { type: String, default: "#ea580c" },   // hex
        secondary_color: { type: String, default: "#dc2626" }, // hex
        font: {
            type: String,
            enum: ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Nunito', 'Work Sans', 'Lato', 'Manrope'],
            default: 'Inter'
        },
        logo_url: { type: String, default: null }
    },
    // Whether the restaurant owner (not just superadmin) can edit their own menu's
    // description/ingredients/nutrition_info. Off by default — superadmin opts them in.
    owner_can_edit_menu_content: { type: Boolean, default: false },
    // Allowlist of MenuItem.tags values safe to use as a recommend-dish comparison axis
    // (e.g. "sıcak" vs "soğuk" makes sense; "italyan" vs "deniz_ürünü" doesn't). Curated
    // by superadmin per restaurant. Empty = no restriction (all tags eligible).
    comparable_tags: [{ type: String }]
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
