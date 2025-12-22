// test-ai.js - Hata Ayıklama Modu
async function testEt() {
    console.log("🤖 AI Asistana bağlanılıyor...");

    try {
        const response = await fetch('http://localhost:5000/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                restaurantSlug: "kral-burger",
                menuItemName: "Tütsülenmiş Mega Burger"
            })
        });

        const data = await response.json();

        // HATA VARSA GÖSTER
        if (data.error) {
            console.log("\n❌ HATA OLUŞTU:");
            console.log(data.error);
            return; // Durdur
        }

        // HATA YOKSA CEVABI GÖSTER
        console.log("\n------------------------------------------------");
        console.log(`🎙️  ASİSTAN (${data.character}):`);
        console.log(`💬  "${data.question}"`);
        console.log("------------------------------------------------\n");

    } catch (err) {
        console.log("Bağlantı Hatası:", err);
    }
}

testEt();