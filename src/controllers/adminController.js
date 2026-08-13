// src/controllers/adminController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const openai = require('../config/openai');
const { ADMIN_JWT_SECRET } = require('../config/auth');
const Admin = require('../models/Admin');
const Restaurant = require('../models/Restaurant');
const Feedback = require('../models/Feedback');
const AnalyticsReport = require('../models/AnalyticsReport');
const MenuItem = require('../models/MenuItem');
const { getCachedDashboardStats, setCachedDashboardStats } = require('../services/dashboardStatsCache');

// --- ADMIN LOGIN (owner or superadmin) ---
async function login(req, res) {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });
        if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
            return res.status(401).json({ error: "Hatalı kullanıcı adı veya şifre!" });
        }

        const token = jwt.sign(
            { adminId: admin._id, restaurant_id: admin.restaurant_id, role: admin.role },
            ADMIN_JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ status: "success", token: token });
    } catch (error) {
        console.error("Login Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- DASHBOARD STATS ROUTE (Aggregation + AI analysis + cache) ---
// Restaurant is derived from the authenticated admin's own token (req.admin.restaurant_id),
// never from a URL/body param — this is what keeps one owner from viewing another's data.
async function dashboardStats(req, res) {
    const { period } = req.query;
    const selectedPeriod = period || 'daily';

    try {
        if (!req.admin.restaurant_id) {
            return res.status(400).json({ error: "Bu hesap bir restorana bağlı değil" });
        }

        const cachedResponse = getCachedDashboardStats(req.admin.restaurant_id, selectedPeriod);
        if (cachedResponse) {
            return res.json(cachedResponse);
        }

        const restaurant = await Restaurant.findById(req.admin.restaurant_id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        // 1. SET DATE RANGE
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (selectedPeriod === 'weekly') {
            const day = startDate.getDay() || 7;
            if (day !== 1) startDate.setHours(-24 * (day - 1));
        } else if (selectedPeriod === 'monthly') {
            startDate.setDate(1);
        } else if (selectedPeriod === 'yearly') {
            startDate.setMonth(0, 1);
        } else if (selectedPeriod === 'all') {
            startDate = new Date(0);
        }

        // 2. FETCH FRESH LIST
        const freshFeedbacks = await Feedback.find({
            restaurant_id: restaurant._id,
            created_at: { $gte: startDate, $lte: endDate }
        })
            .sort({ created_at: -1 })
            .limit(20);

        // 3. CALCULATE STATS
        let stats = {
            total: 0,
            score: 0,
            ai: "Veri toplanıyor...",
            cached: false,
            topDishes: [],
            categoryStats: []
        };

        const existingReport = await AnalyticsReport.findOne({
            restaurant_id: restaurant._id,
            period_type: selectedPeriod,
            period_start: { $gte: startDate, $lt: new Date(startDate.getTime() + 1000) },
            created_at: { $gt: new Date(now.getTime() - 60 * 60 * 1000) }
        }).sort({ created_at: -1 });

        const allFeedbacks = await Feedback.find({
            restaurant_id: restaurant._id,
            created_at: { $gte: startDate, $lte: endDate }
        });

        if (allFeedbacks.length > 0) {
            stats.total = allFeedbacks.length;
            stats.score = allFeedbacks.reduce((acc, curr) => acc + (curr.sentiment_score || 0), 0) / allFeedbacks.length;

            // --- AGGREGATION ENGINE ---
            const dishMap = {};
            const categoryMap = {};

            allFeedbacks.forEach(fb => {
                if (fb.detailed_scores && fb.detailed_scores.length > 0) {
                    fb.detailed_scores.forEach(ds => {
                        if (ds.category === 'Yemek' || ds.category === 'İçecek' || ds.category === 'Genel') {
                            if (!dishMap[ds.item]) dishMap[ds.item] = { sum: 0, count: 0 };
                            dishMap[ds.item].sum += ds.score;
                            dishMap[ds.item].count += 1;
                        }
                        if (!categoryMap[ds.category]) categoryMap[ds.category] = { sum: 0, count: 0 };
                        categoryMap[ds.category].sum += ds.score;
                        categoryMap[ds.category].count += 1;
                    });
                }
            });

            stats.topDishes = Object.keys(dishMap).map(key => ({
                name: key,
                score: dishMap[key].sum / dishMap[key].count,
                count: dishMap[key].count
            })).sort((a, b) => b.score - a.score).slice(0, 5);

            stats.categoryStats = Object.keys(categoryMap).map(key => ({
                name: key,
                score: categoryMap[key].sum / categoryMap[key].count
            }));

            // --- AI PART ---
            // Cached for every period including 'daily' (1hr TTL via existingReport's query) —
            // "today" is the most-viewed tab, so it was the biggest source of repeat AI cost.
            if (existingReport) {
                stats.ai = existingReport.ai_summary;
                stats.cached = true;
            } else {
                // Fair sampling
                const MAX_SAMPLES = 40;
                let sampledFeedbacks = [];
                if (stats.total <= MAX_SAMPLES) {
                    sampledFeedbacks = allFeedbacks;
                } else {
                    const step = Math.floor(stats.total / MAX_SAMPLES);
                    for (let i = 0; i < stats.total; i += step) {
                        sampledFeedbacks.push(allFeedbacks[i]);
                        if (sampledFeedbacks.length >= MAX_SAMPLES) break;
                    }
                }

                const feedbackText = sampledFeedbacks.map(f => {
                    const details = f.detailed_scores?.map(d => `${d.item}:${d.score}`).join(', ') || "";
                    const msg = f.conversation_history.find(m => m.role === 'user')?.content || "";
                    return `(${f.sentiment_score}/5) [${details}] - "${msg}"`;
                }).join('\n');

                try {
                    const prompt = `
                        DÖNEM: ${selectedPeriod.toUpperCase()}
                        TOPLAM YORUM: ${stats.total}
                        EN İYİ YEMEKLER: ${stats.topDishes.map(d => d.name).join(', ')}

                        YORUMLAR:
                        ${feedbackText}

                        GÖREV: Restoran sahibine kısa, vurucu bir analiz yap.
                        Detaylara odaklan (Örn: "Burgerler harika ama servis aksıyor").
                     `;
                    const completion = await openai.chat.completions.create({
                        messages: [{ role: "system", content: "Sen profesyonel bir restoran danışmanısın." }, { role: "user", content: prompt }],
                        model: "gpt-4o-mini",
                    });
                    stats.ai = completion.choices[0].message.content;

                    await AnalyticsReport.create({
                        restaurant_id: restaurant._id,
                        period_type: selectedPeriod,
                        period_start: startDate,
                        period_end: endDate,
                        total_feedback: stats.total,
                        average_score: stats.score,
                        ai_summary: stats.ai
                    });

                } catch (err) {
                    console.log(err);
                    stats.ai = "Analiz yapılamadı.";
                }
            }
        }

        const responseBody = {
            period: selectedPeriod,
            totalFeedback: stats.total,
            averageScore: stats.score,
            aiAnalysis: stats.ai,
            isCached: stats.cached,
            topDishes: stats.topDishes,
            categoryStats: stats.categoryStats,
            feedbacksPreview: freshFeedbacks
        };
        setCachedDashboardStats(req.admin.restaurant_id, selectedPeriod, responseBody);
        res.json(responseBody);

    } catch (error) {
        console.error("Dashboard Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- OWNER: LIST OWN MENU (content-editing permission required) ---
async function getOwnMenu(req, res) {
    try {
        const items = await MenuItem.find({ restaurant_id: req.admin.restaurant_id });
        res.json(items);
    } catch (error) {
        console.error("Menü Getirme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- OWNER: EDIT OWN MENU ITEM'S CONTENT ONLY (name/price/category/photo stay superadmin-only) ---
async function updateOwnMenuItem(req, res) {
    const { description, ingredients, nutrition_info } = req.body;

    try {
        const item = await MenuItem.findOne({ _id: req.params.itemId, restaurant_id: req.admin.restaurant_id });
        if (!item) return res.status(404).json({ error: "Ürün bulunamadı" });

        if (description !== undefined) item.description = description;
        if (ingredients !== undefined) item.ingredients = ingredients;
        if (nutrition_info !== undefined) item.nutrition_info = nutrition_info;

        await item.save();
        res.json(item);
    } catch (error) {
        console.error("Ürün Güncelleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

module.exports = { login, dashboardStats, getOwnMenu, updateOwnMenuItem };
