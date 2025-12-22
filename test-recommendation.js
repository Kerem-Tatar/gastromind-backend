// test-recommendation.js
const RESTAURANT_SLUG = "kral-burger";

async function baslat() {
    console.log("🎮 Öneri Oyunu Başlıyor...");
    let elenenYemekler = []; // Başta hiçbiri elenmedi
    let oyunBitti = false;

    while (!oyunBitti) {
        // Sunucuya sor
        const response = await fetch('http://localhost:5000/api/recommend-dish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurantSlug: RESTAURANT_SLUG,
                excludedDishIds: elenenYemekler
            })
        });

        const data = await response.json();

        if (data.status === "complete") {
            console.log("\n✅ FİNAL! SANA ÖNERİM:");
            data.recommendations.forEach(r => console.log(`- 🍔 ${r.name} (${r.price} TL)`));
            oyunBitti = true;
        }
        else {
            // Soru Geldi
            console.log(`\n🎙️  ${data.character}: ${data.question_data.question}`);
            console.log(`   [A] ${data.question_data.optionA.text}`);
            console.log(`   [B] ${data.question_data.optionB.text}`);

            // --- SİMÜLASYON KISMI ---
            // Burada normalde müşteri bir şıkkı seçer. 
            // Biz testi görmek için rastgele bir şıkkı seçiyoruz (Simülasyon).
            // Veya sen kodu durdurup manuel değiştirebilirsin ama şimdilik A şıkkını seçelim hep.

            console.log("👉 (Müşteri A şıkkını seçti varsayıyoruz...)");

            // A şıkkı hangi etiketi temsil ediyor? (Örn: "sıcak")
            // Biz "sıcak" seçtiysek, "sıcak" OLMAYAN yemekleri bulup elememiz lazım.
            // (Burada basitlik için ID listesini manuel doldurmuyorum, sadece soruyu görmen yeterli şu an)

            // Döngüyü kırmamak için şimdilik manuel bitiriyorum (Tek soru görelim)
            oyunBitti = true;
        }
    }
}

baslat();