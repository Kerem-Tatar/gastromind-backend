// src/models/MenuItem.js
const mongoose = require('mongoose');

const MenuItemSchema = new mongoose.Schema({
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    name: { type: String, required: true },
    description: String,
    ingredients: { type: String, default: "" },     // "İçerik" — serbest metin
    nutrition_info: { type: String, default: "" },  // "Besin Değerleri" — serbest metin
    price: Number,
    image: String,
    category: { type: String, required: true },
    tags: [{ type: String }] // ["sıcak", "etli", "acı"]
});

module.exports = mongoose.model('MenuItem', MenuItemSchema);
