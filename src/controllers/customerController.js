// src/controllers/customerController.js
const openai = require('../config/openai');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Feedback = require('../models/Feedback');
const AnalyticsReport = require('../models/AnalyticsReport');
const { analyzeFeedbackWithAI } = require('../services/feedbackAnalysisService');
const { getCachedQuestion, setCachedQuestion } = require('../services/questionCache');

// --- PUBLIC RESTAURANT PROFILE (name, branding, categories — used by the customer app shell) ---
async function getRestaurantInfo(req, res) {
    const { slug } = req.params;

    try {
        const restaurant = await Restaurant.findOne({ slug });
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        res.json({
            name: restaurant.name,
            slug: restaurant.slug,
            logo_url: restaurant.branding?.logo_url || null,
            primary_color: restaurant.branding?.primary_color,
            secondary_color: restaurant.branding?.secondary_color,
            font: restaurant.branding?.font,
            categories: restaurant.categories || []
        });
    } catch (error) {
        console.error("Restoran Bilgisi Hatası:", error);
        res.status(500).json({ error: "Restoran bilgisi alınamadı" });
    }
}

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

// --- Pick two tags to split `dishes` on, without calling AI ---
// Prefers tags whose count is close to half of the set (balanced split), and among
// those, the pair that co-occurs least (so picking one meaningfully excludes the other's
// crowd). Keeps recommendDish's prompt tiny regardless of menu size — see AI cost notes.
//
// `allowedTags`, when non-empty, restricts candidates to superadmin-curated tags that are
// known to make sense as a comparison axis (e.g. "sıcak" vs "soğuk", not "italyan" vs
// "deniz_ürünü") — this is what keeps the AI from being asked to phrase a nonsensical
// question when "Kararsızım / Hepsi" mixes dishes from unrelated categories. If the
// current dish pool doesn't have 2 allowed tags left, falls back to all tags for that
// round rather than breaking the game.
function pickSplittingTags(dishes, allowedTags = []) {
    const tagCounts = {};
    dishes.forEach(d => d.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

    const total = dishes.length;
    const balanceScore = (count) => Math.abs(count - total / 2);
    const allowedSet = new Set(allowedTags);

    let candidateTags = Object.keys(tagCounts)
        .filter(t => tagCounts[t] > 0 && tagCounts[t] < total) // ignore tags everyone/no one has
        .filter(t => allowedSet.size === 0 || allowedSet.has(t))
        .sort((a, b) => balanceScore(tagCounts[a]) - balanceScore(tagCounts[b]))
        .slice(0, 6); // only compare the most balanced handful — keeps this O(1)-ish

    // Curated list doesn't cover what's left in this round — don't get stuck, widen back out.
    if (candidateTags.length < 2 && allowedSet.size > 0) {
        candidateTags = Object.keys(tagCounts)
            .filter(t => tagCounts[t] > 0 && tagCounts[t] < total)
            .sort((a, b) => balanceScore(tagCounts[a]) - balanceScore(tagCounts[b]))
            .slice(0, 6);
    }

    if (candidateTags.length < 2) {
        const fallback = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
        return [fallback[0] || null, fallback[1] || null];
    }

    let bestPair = [candidateTags[0], candidateTags[1]];
    let bestCoOccurrence = Infinity;

    for (let i = 0; i < candidateTags.length; i++) {
        for (let j = i + 1; j < candidateTags.length; j++) {
            const [a, b] = [candidateTags[i], candidateTags[j]];
            const coOccurring = dishes.filter(d => d.tags.includes(a) && d.tags.includes(b)).length;
            if (coOccurring < bestCoOccurrence) {
                bestCoOccurrence = coOccurring;
                bestPair = [a, b];
            }
        }
    }

    return bestPair;
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

        // A handful of leftover dishes is a fine final answer — skip one more AI round.
        if (availableDishes.length <= 3) {
            return res.json({
                status: "complete",
                recommendations: availableDishes
            });
        }

        const [tagA, tagB] = pickSplittingTags(availableDishes, restaurant.comparable_tags);

        // Same restaurant + same tag pair has almost certainly been asked before by another
        // customer — reuse that phrasing instead of paying for a fresh completion.
        let aiResponse = getCachedQuestion(restaurant._id, tagA, tagB);

        if (!aiResponse) {
            // Prompt only carries the two chosen tags + persona/tone — not the dish list —
            // so its size no longer scales with menu size (see AI cost optimization notes).
            const systemPrompt = `
      Sen ${restaurant.name} restoranında çalışan '${restaurant.ai_config.persona_name}' adında zeki bir garsonsun.
      Tonun: ${restaurant.ai_config.tone}.
      GÖREVİN: "${tagA}" ve "${tagB}" özelliklerini karşılaştıran, kısa ve samimi bir soru yaz.
      Anket sorusu gibi durmasın, sohbet eder gibi olsun.
      ÇIKTI FORMATI (JSON): { "question": "...", "optionA": {"text": "...", "related_tag": "${tagA}"}, "optionB": {"text": "...", "related_tag": "${tagB}"} }
    `;

            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "gpt-4o-mini",
                response_format: { type: "json_object" }
            });

            aiResponse = JSON.parse(completion.choices[0].message.content);
            setCachedQuestion(restaurant._id, tagA, tagB, aiResponse);
        }

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

module.exports = { getRestaurantInfo, getMenu, askAi, recommendDish, submitFeedback };
