// src/models/Feedback.js
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    restaurant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    table_no: { type: String, default: "Genel" },
    dish_name: { type: String, default: "Belirtilmemiş" },

    // OVERALL SCORE (calculated by AI)
    sentiment_score: { type: Number, default: 0 },

    // DETAILED SCORING
    detailed_scores: [{
        category: String, // "Yemek", "Hizmet"
        item: String,     // "Hamburger", "Garson"
        score: Number      // 1-5
    }],

    summary_tags: [String],

    // CONVERSATION HISTORY
    conversation_history: [{
        role: String,
        content: String
    }],

    customer_photo: String,
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
