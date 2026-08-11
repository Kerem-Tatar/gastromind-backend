// src/models/AnalyticsReport.js
const mongoose = require('mongoose');

const AnalyticsReportSchema = new mongoose.Schema({
    restaurant_id: mongoose.Schema.Types.ObjectId,
    period_type: String, // 'daily', 'weekly', 'monthly', 'yearly', 'all'
    period_start: Date,
    period_end: Date,

    // Calculated stats
    total_feedback: Number,
    average_score: Number,

    // AI's summary
    ai_summary: String,

    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AnalyticsReport', AnalyticsReportSchema);
