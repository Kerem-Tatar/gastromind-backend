// test-interactive.js
const readline = require('readline');

// Kullanıcıdan veri almak için arayüz
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const RESTAURANT_SLUG = "kral-burger";
let elenenYemekler = []; // Elenenlerin ID'si burada birikecek

// Sunucuya istek atan yardımcı fonksiyon
async function fetchRecommendation() {
    const response = await fetch('http://localhost:5000/api/recommend-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            restaurantSlug: RESTAURANT_SLUG,
            excludedDishIds: elenenYemekler
        })
    });
    return await response.json();
}

// Oyunu Başlatan Döngü
async function oyunuBaslat() {
    console.log("\n🎮 --- GASTROMIND ÖNERİ OYUNU BAŞLIYOR --- 🎮\n");

    while (true) {
        const data = await fetchRecommendation();

        // 1. OYUN BİTTİ Mİ? (SONUÇ GELDİ Mİ?)
        if (data.status === "complete") {
            console.log(`\n🎉 ${data.recommendations[0].name} restoranından sana özel öneriler:`);
            data.recommendations.forEach(r => {
                console.log(`\n🍔  ${r.name.toUpperCase()}`);
                console.log(`    ${r.description}`);
                console.log(`    Fiyat: ${r.price} TL`);
            });
            console.log("\nAfiyet olsun! (Oyun Bitti)");
            rl.close();
            break;
        }

        // 2. SORU GELDİ
        const q = data.question_data;
        console.log(`\n🤖 Barış: "${q.question}"`);
        console.log(`   [A] ${q.optionA.text}`);
        console.log(`   [B] ${q.optionB.text}`);

        // 3. KULLANICIDAN CEVAP BEKLE
        const cevap = await new Promise(resolve => {
            rl.question('\nSeçimin (A veya B): ', (ans) => {
                resolve(ans.trim().toUpperCase());
            });
        });

        // 4. ELEME MANTIĞI (Sihirli Kısım)
        // Kullanıcının seçtiği etiketi buluyoruz
        let secilenEtiket = "";
        if (cevap === 'A') secilenEtiket = q.optionA.related_tag;
        else if (cevap === 'B') secilenEtiket = q.optionB.related_tag;
        else {
            console.log("❌ Geçersiz seçim! Tekrar dene.");
            continue; // Döngü başına dön
        }

        console.log(`\n👉 Seçilen Kriter: "${secilenEtiket}"`);
        console.log("   (Bu kritere uymayanlar eleniyor...)");

        // Mantık: Seçilen etikete SAHİP OLMAYANLARI bul ve listeye ekle
        const elenecekler = data.candidates.filter(yemek => {
            // Yemeğin etiketleri içinde 'secilenEtiket' YOKSA ele
            return !yemek.tags.includes(secilenEtiket);
        });

        // ID'leri havuza at
        elenecekler.forEach(e => {
            if (!elenenYemekler.includes(e._id)) {
                elenenYemekler.push(e._id);
                console.log(`   🗑️ Elendi: ${e.name}`);
            }
        });
    }
}

oyunuBaslat();