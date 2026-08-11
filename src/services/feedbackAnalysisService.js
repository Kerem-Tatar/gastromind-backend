// src/services/feedbackAnalysisService.js
const openai = require('../config/openai');

// Takes a conversation_history and scores it with AI.
async function analyzeFeedbackWithAI(history) {
    // Combine only the user's messages
    const userText = history
        .filter(m => m.role === 'user')
        .map(m => m.content || m.text) // Hem 'content' hem 'text' desteği
        .join(" . ");

    if (!userText || userText.length < 5) {
        return { sentiment_score: 3, detailed_scores: [], summary_tags: ["nötr"] };
    }

    try {
        const prompt = `
      GÖREV: Aşağıdaki müşteri yorumunu analiz et ve JSON formatında puanla.
      YORUM: "${userText}"

      KURALLAR:
      1. Sadece yorumda AÇIKÇA bahsedilenleri puanla (1-5 arası).
      2. Kategori: "Yemek", "İçecek", "Hizmet", "Ortam", "Fiyat".
      3. "sentiment_score" genel ortalama olsun.
      4. 3 adet kısa etiket çıkar.

      ÇIKTI FORMATI (JSON):
      {
        "sentiment_score": 4,
        "detailed_scores": [
           { "category": "Yemek", "item": "Hamburger", "score": 5 }
        ],
        "summary_tags": ["#lezzetli"]
      }
    `;

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Sen JSON döndüren bir veri analistisin." },
                { role: "user", content: prompt }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" }
        });

        return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
        console.error("AI Analiz Hatası:", error);
        return { sentiment_score: 0, detailed_scores: [], summary_tags: [] };
    }
}

module.exports = { analyzeFeedbackWithAI };
