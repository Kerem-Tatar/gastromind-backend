// src/controllers/customerController.js
const openai = require('../config/openai');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Feedback = require('../models/Feedback');
const AnalyticsReport = require('../models/AnalyticsReport');
const { analyzeFeedbackWithAI } = require('../services/feedbackAnalysisService');

// --- PUBLIC MENU LISTING (used by the dish-select screen) ---
async function getMenu(req, res) {
    const { slug } = req.params;

    try {
        const restaurant = await Restaurant.findOne({ slug });
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        const menu = await MenuItem.find({ restaurant_id: restaurant._id });
        res.json(menu);
    } catch (error) {
        console.error("Menü Hatası:", error);
        res.status(500).json({ error: "Menü alınamadı" });
    }
}

// --- AI QUESTION GENERATION HUB ---
// Frontend (site) calls this with "I ate this dish".
async function askAi(req, res) {
    const { restaurantSlug, menuItemName } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı!" });

        const menuItem = await MenuItem.findOne({
            restaurant_id: restaurant._id,
            name: menuItemName
        });

        // If the dish isn't found, fall back to a generic empty object so it still asks something
        const itemTags = menuItem ? menuItem.tags.join(", ") : "genel menü";
        const itemDesc = menuItem ? menuItem.description : "belirtilmemiş";

        // PROMPT ENGINEERING: load the AI persona based on the restaurant type.
        const systemPrompt = `
      Sen ${restaurant.name} restoranında çalışan '${restaurant.ai_config.persona_name}' adında bir yapay zeka asistanısın.

      KARAKTERİN:
      - Tonun: ${restaurant.ai_config.tone} (Buna harfiyen uy).
      - Önceliklerin: ${restaurant.ai_config.priority_metrics.join(", ")}.

      DURUM:
      - Müşteri az önce "${menuItemName}" yedi.
      - Yemeğin Özellikleri: ${itemTags}. (${itemDesc})

      GÖREVİN:
      Müşteriye yemeği ve deneyimi hakkında TEK BİR soru sor.
      Soru sıkıcı bir anket sorusu gibi OLMASIN. Sohbet eder gibi, samimi ve kısa olsun.
      Yemeğin spesifik bir özelliğine (sıcaklık, sos, çıtırlık vb.) odaklan.
    `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }],
            model: "gpt-4o-mini", // Hızlı ve ucuz model
        });

        const aiQuestion = completion.choices[0].message.content;
        res.json({ question: aiQuestion, character: restaurant.ai_config.persona_name });

    } catch (error) {
        console.error("AI Hatası:", error);
        res.status(500).json({ error: "AI şu an düşünemiyor :(" });
    }
}

// --- CATEGORY-AWARE RECOMMENDATION SYSTEM (SMART WAITER) ---
async function recommendDish(req, res) {
    const { restaurantSlug, excludedDishIds, selectedCategory } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ slug: restaurantSlug });

        let query = {
            restaurant_id: restaurant._id,
            _id: { $nin: excludedDishIds || [] }
        };
        if (selectedCategory && selectedCategory !== 'hepsi') {
            query.category = selectedCategory;
        }

        const availableDishes = await MenuItem.find(query);

        if (availableDishes.length <= 1) {
            return res.json({
                status: "complete",
                recommendations: availableDishes
            });
        }

        const dishSummary = availableDishes.map(d => `${d.name} (Etiketler: ${d.tags.join(', ')})`).join('\n');
        const allActiveTags = [...new Set(availableDishes.flatMap(d => d.tags))];

        const systemPrompt = `
      Sen ${restaurant.name} restoranında çalışan '${restaurant.ai_config.persona_name}' adında zeki bir garsonsun.
      ELİNDEKİ SEÇENEKLER: ${dishSummary}
      MEVCUT ETİKETLER: ${allActiveTags.join(', ')}
      GÖREVİN: Kalan yemekleri ikiye bölecek mantıklı bir soru sor.
      ÇIKTI FORMATI (JSON): { "question": "...", "optionA": {"text": "...", "related_tag": "..."}, "optionB": {"text": "...", "related_tag": "..."} }
    `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);

        res.json({
            status: "ongoing",
            character: restaurant.ai_config.persona_name,
            question_data: aiResponse,
            candidates: availableDishes
        });

    } catch (error) {
        console.error("Öneri Hatası:", error);
        res.status(500).json({ error: "Kararsız kaldım..." });
    }
}

// --- FEEDBACK SUBMISSION (AI-analyzed) ---
async function submitFeedback(req, res) {
    const { restaurantSlug, conversation, dishName, customerPhoto } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ slug: restaurantSlug });
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        console.log("🤖 AI Analizi yapılıyor...");
        const analysis = await analyzeFeedbackWithAI(conversation);

        const newFeedback = await Feedback.create({
            restaurant_id: restaurant._id,
            table_no: "Genel",
            dish_name: dishName || "Belirtilmemiş",
            customer_photo: customerPhoto,
            conversation_history: conversation.map(msg => ({
                role: msg.role,
                content: msg.text || msg.content // Frontend'den 'text' veya 'content' gelebilir
            })),
            sentiment_score: analysis.sentiment_score,
            detailed_scores: analysis.detailed_scores,
            summary_tags: analysis.summary_tags
        });

        // Clear old cached reports so the charts refresh
        await AnalyticsReport.deleteMany({ restaurant_id: restaurant._id });

        console.log("✅ KAYIT VE ANALİZ BAŞARILI! Puan:", analysis.sentiment_score);
        res.json({ status: "success", message: "Geri bildiriminiz alındı!" });

    } catch (error) {
        console.error("Kayıt Hatası:", error);
        res.status(500).json({ error: "Veritabanı hatası" });
    }
}

module.exports = { getMenu, askAi, recommendDish, submitFeedback };
