// src/controllers/devController.js
// WARNING: dev/demo seed routes — they delete data. Admin-auth protected (see devRoutes.js).
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Feedback = require('../models/Feedback');
const AnalyticsReport = require('../models/AnalyticsReport');

// --- SAMPLE RESTAURANT + MENU CREATION (DEMO SEED) ---
async function createDummyRestaurant(req, res) {
    try {
        const oldDemo = await Restaurant.findOne({ slug: 'demo-restoran' });
        if (oldDemo) {
            await MenuItem.deleteMany({ restaurant_id: oldDemo._id });
        }
        await Restaurant.deleteMany({ slug: 'demo-restoran' });

        const newRestaurant = await Restaurant.create({
            name: "Demo Bistro",
            slug: "demo-restoran",
            type: "fast_casual",
            ai_config: {
                persona_name: "Asistan",
                tone: "enerjik_ve_samimi",
                priority_metrics: ["servis_hızı", "et_pisimi", "patates_citirligi"]
            }
        });

        await MenuItem.insertMany([
            {
                restaurant_id: newRestaurant._id,
                name: "Tütsülenmiş Mega Burger",
                category: "ana_yemek",
                description: "180gr dana eti, karamelize soğan, özel tütsü sos.",
                price: 250,
                tags: ["et", "doyurucu", "sıcak", "elle_yenen", "amerikan_mutfagi"],
                image: "https://static.wixstatic.com/media/1ba607_5a1ac620524d457eb7d426542e85bc91~mv2_d_4949_3299_s_4_2.jpeg/v1/fit/w_500,h_500,q_90/file.jpg"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Çıtır Soğan Halkaları",
                category: "atistirmalik",
                description: "8 adet, yanında ranch sos ile.",
                price: 90,
                tags: ["sebze", "kızartma", "çıtır", "sıcak", "atıştırmalık", "paylaşımlık"],
                image: "https://cdn.zyrosite.com/cdn-ecommerce/store_01JHSY4AKDMF8WP0YVZFHK61RJ%2Fassets%2F1737363316995-34.jpg"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Ev Yapımı Limonata",
                category: "icecek",
                description: "Naneli ferahlatıcı lezzet.",
                price: 70,
                tags: ["içecek", "soğuk", "ferahlatıcı", "meyveli", "tatlı_ekşi"],
                image: "https://cdn.dsmcdn.com/ty1659/prod/QC/20250409/01/58a3443a-f251-3029-bebe-44040568bce1/1_org.jpg"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Adana Kebap",
                category: "ana_yemek",
                description: "Zırh kıyması, közlenmiş biber ve domates ile.",
                price: 320,
                tags: ["et", "acı", "sıcak", "geleneksel", "doyurucu", "ızgara"],
                image: "https://saraylidoner.com/wp-content/uploads/2022/07/adana-1-500x311.jpg"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Izgara Somon",
                category: "ana_yemek",
                description: "Taze kuşkonmaz ve limonlu sos eşliğinde.",
                price: 450,
                tags: ["deniz_ürünü", "hafif", "sıcak", "sağlıklı", "ızgara"],
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9ttdQRLrjvoQteH2-Wlzj4f87DUmTVuEJmQ&s"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Penne Arabiata",
                category: "ana_yemek",
                description: "Acılı domates soslu, parmesanlı makarna.",
                price: 210,
                tags: ["hamurişi", "acı", "sıcak", "italyan", "vegan", "doyurucu"],
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmpJ9Kmy8SJDMZX6-UGCcK4ZPsMxAzuMHS7A&s"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Taş Fırın Lahmacun",
                category: "ana_yemek",
                description: "İncecik hamur, bol malzemeli, çıtır.",
                price: 120,
                tags: ["hamurişi", "et", "sıcak", "geleneksel", "çıtır", "hafif"],
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5euqQ0b7eWa5fRHcP3MPhYzUdv_OyJ7iI_w&s"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Tavuklu Sezar Salata",
                category: "salata",
                description: "Izgara tavuk, kruton ekmek ve parmesan.",
                price: 190,
                tags: ["beyaz_et", "soğuk", "hafif", "sağlıklı", "sebze"],
                image: "https://d17wu0fn6x6rgz.cloudfront.net/img/w/tarif/mgt/tavuklu-sezar-salata.webp"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Mercimek Çorbası",
                category: "corba",
                description: "Süzme mercimek, tereyağlı sos.",
                price: 90,
                tags: ["sıvı", "sıcak", "başlangıç", "geleneksel", "hafif"],
                image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrPJMqgC3zWHTw3LKbU1Ve4Q-QqmN2ZKKs37loFQrkdlkzbTYUhWjSG0SdSSlKFMrU8viwEnrvUPCdANvMgvElK24fjohr9gwses3daC4&s=10"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "San Sebastian Cheesecake",
                category: "tatli",
                description: "Akışkan kıvamlı, yanında çikolata sos ile.",
                price: 180,
                tags: ["tatlı", "soğuk", "sütlü", "popüler"],
                image: "https://i.nefisyemektarifleri.com/2020/01/03/sansebastian-ceescake-600x400.jpg"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Klasik Tiramisu",
                category: "tatli",
                description: "Mascarpone peyniri ve espresso ile.",
                price: 160,
                tags: ["tatlı", "soğuk", "kahveli", "italyan"],
                image: "https://cdn.myikas.com/images/52036155-b163-4fc0-a730-34e056fc0d79/6064278c-41fc-405d-b24a-702084e0988a/image_1080.webp"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Buzlu Latte",
                category: "icecek",
                description: "Espresso ve soğuk süt.",
                price: 110,
                tags: ["içecek", "soğuk", "kahve", "sütlü"],
                image: "https://api.mircate.com/5p1hp1d2t/CALL/PIMAPI/getImage/1j19r3y78mj?filename=1j19r3y78mj-7323d9e7bdfb460d82af5701be774062.png"
            },
            {
                restaurant_id: newRestaurant._id,
                name: "Türk Kahvesi",
                category: "icecek",
                description: "Çifte kavrulmuş, lokum ile.",
                price: 80,
                tags: ["içecek", "sıcak", "kahve", "geleneksel", "acı"],
                image: "https://static.ticimax.cloud/cdn-cgi/image/width=540,quality=99/2571/uploads/blog/lezzetli-turk-kahvesinin-tarifi-452e.jpg"
            }
        ]);

        res.json({ message: "✅ Örnek Restoran ve Menü Oluşturuldu!", restaurant: newRestaurant });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// --- DETAILED TEST DATA GENERATOR (SEEDER) ---
// Scoped to the caller's own restaurant (from the token) — an owner can only seed their own data.
async function seedFakeData(req, res) {
    try {
        if (!req.admin.restaurant_id) {
            return res.status(400).json({ error: "Bu hesap bir restorana bağlı değil" });
        }
        const restaurant = await Restaurant.findById(req.admin.restaurant_id);
        if (!restaurant) return res.status(404).json({ error: "Restoran yok" });

        const scenarios = [
            {
                text: "Hamburger efsaneydi ama garsonlar çok asıktı.",
                overall: 4,
                details: [
                    { category: "Yemek", item: "Hamburger", score: 5 },
                    { category: "Hizmet", item: "Garson", score: 2 }
                ],
                tags: ["lezzetli", "ilgisiz"]
            },
            {
                text: "Patatesler buz gibi geldi, hiç yakışmadı.",
                overall: 2,
                details: [
                    { category: "Yemek", item: "Patates", score: 1 },
                    { category: "Hizmet", item: "Hız", score: 3 }
                ],
                tags: ["soğuk"]
            },
            {
                text: "Müzikler çok gürültülüydü, kafa şişirdi ama pizza iyi.",
                overall: 3,
                details: [
                    { category: "Ortam", item: "Müzik", score: 1 },
                    { category: "Yemek", item: "Pizza", score: 4 }
                ],
                tags: ["gürültülü", "lezzetli"]
            },
            {
                text: "Her zamanki gibi harika, favorim Mega Burger!",
                overall: 5,
                details: [
                    { category: "Genel", item: "Deneyim", score: 5 },
                    { category: "Yemek", item: "Mega Burger", score: 5 }
                ],
                tags: ["süper", "müdavim"]
            },
            {
                text: "Cola asitsizdi, değiştirmediler bile.",
                overall: 1,
                details: [
                    { category: "İçecek", item: "Cola", score: 1 },
                    { category: "Hizmet", item: "İlgi", score: 1 }
                ],
                tags: ["kötü_servis"]
            }
        ];

        const dishNames = ["Mega Burger", "Pizza Margherita", "Tavuk Dünyası", "Sushi Mix"];

        let fakeData = [];
        for (let i = 0; i < 50; i++) {
            const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            const randomDish = dishNames[Math.floor(Math.random() * dishNames.length)];

            const randomDaysAgo = Math.floor(Math.random() * 30);
            const fakeDate = new Date();
            fakeDate.setDate(fakeDate.getDate() - randomDaysAgo);
            fakeDate.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));

            fakeData.push({
                restaurant_id: restaurant._id,
                table_no: "Simülasyon",
                dish_name: randomDish,
                sentiment_score: randomScenario.overall,
                detailed_scores: randomScenario.details,
                summary_tags: randomScenario.tags,
                conversation_history: [{ role: 'user', content: randomScenario.text }],
                created_at: fakeDate
            });
        }

        await Feedback.insertMany(fakeData);

        // Clear cache so the admin panel shows fresh data
        await AnalyticsReport.deleteMany({ restaurant_id: restaurant._id });

        res.json({ status: "success", message: "50 Adet DETAYLI Test Verisi Eklendi! 🚀" });

    } catch (error) {
        console.error("Seed Hatası:", error);
        res.status(500).json({ error: "Veri üretilemedi" });
    }
}

module.exports = { createDummyRestaurant, seedFakeData };
