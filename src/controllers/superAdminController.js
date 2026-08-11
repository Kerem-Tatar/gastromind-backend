// src/controllers/superAdminController.js
const bcrypt = require('bcryptjs');
const Restaurant = require('../models/Restaurant');
const Admin = require('../models/Admin');
const MenuItem = require('../models/MenuItem');
const { uploadImageBuffer } = require('../config/cloudinary');

// --- ONBOARD A NEW RESTAURANT + ITS OWNER ACCOUNT (superadmin only) ---
async function createRestaurant(req, res) {
    const { name, slug, type, ai_config, tables_count, ownerUsername, ownerPassword } = req.body;

    if (!name || !slug || !ownerUsername || !ownerPassword) {
        return res.status(400).json({ error: "name, slug, ownerUsername ve ownerPassword zorunlu" });
    }

    try {
        const existingRestaurant = await Restaurant.findOne({ slug });
        if (existingRestaurant) {
            return res.status(409).json({ error: "Bu slug zaten kullanımda" });
        }

        const existingAdmin = await Admin.findOne({ username: ownerUsername });
        if (existingAdmin) {
            return res.status(409).json({ error: "Bu kullanıcı adı zaten kullanımda" });
        }

        const restaurant = await Restaurant.create({
            name,
            slug,
            type,
            ai_config,
            tables_count
        });

        const password_hash = await bcrypt.hash(ownerPassword, 10);
        const owner = await Admin.create({
            username: ownerUsername,
            password_hash,
            restaurant_id: restaurant._id,
            role: 'owner'
        });

        res.status(201).json({
            status: "success",
            restaurant,
            owner: { username: owner.username, restaurant_id: owner.restaurant_id }
        });
    } catch (error) {
        console.error("Restoran Oluşturma Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- LIST ALL RESTAURANTS (superadmin only) ---
async function listRestaurants(req, res) {
    try {
        const restaurants = await Restaurant.find().sort({ _id: -1 });
        const owners = await Admin.find({ role: 'owner' });
        const ownerByRestaurant = {};
        owners.forEach(o => { ownerByRestaurant[String(o.restaurant_id)] = o.username; });

        const result = restaurants.map(r => ({
            _id: r._id,
            name: r.name,
            slug: r.slug,
            type: r.type,
            tables_count: r.tables_count,
            ownerUsername: ownerByRestaurant[String(r._id)] || null
        }));

        res.json(result);
    } catch (error) {
        console.error("Restoran Listeleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- GET ONE RESTAURANT + ITS OWNER (superadmin only) ---
async function getRestaurant(req, res) {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        const owner = await Admin.findOne({ restaurant_id: restaurant._id, role: 'owner' });
        res.json({ ...restaurant.toObject(), ownerUsername: owner ? owner.username : null });
    } catch (error) {
        console.error("Restoran Getirme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- CHANGE OWNER USERNAME / PASSWORD (superadmin only) ---
async function updateOwnerCredentials(req, res) {
    const { username, password } = req.body;

    try {
        const owner = await Admin.findOne({ restaurant_id: req.params.id, role: 'owner' });
        if (!owner) return res.status(404).json({ error: "Sahip hesabı bulunamadı" });

        if (username && username !== owner.username) {
            const taken = await Admin.findOne({ username });
            if (taken) return res.status(409).json({ error: "Bu kullanıcı adı zaten kullanımda" });
            owner.username = username;
        }
        if (password) {
            owner.password_hash = await bcrypt.hash(password, 10);
        }
        await owner.save();

        res.json({ status: "success", username: owner.username });
    } catch (error) {
        console.error("Sahip Güncelleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- CATEGORY CRUD FOR A GIVEN RESTAURANT (superadmin only) ---
// Categories are per-restaurant now — MenuItem.category should match one of these `id`s.
async function addCategory(req, res) {
    const { id, name, emoji } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: "id ve name zorunlu" });
    }

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        if (restaurant.categories.some(c => c.id === id)) {
            return res.status(409).json({ error: "Bu kategori id'si zaten var" });
        }

        restaurant.categories.push({ id, name, emoji });
        await restaurant.save();

        res.status(201).json(restaurant.categories);
    } catch (error) {
        console.error("Kategori Ekleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

async function deleteCategory(req, res) {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        restaurant.categories = restaurant.categories.filter(c => c.id !== req.params.categoryId);
        await restaurant.save();

        res.json(restaurant.categories);
    } catch (error) {
        console.error("Kategori Silme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- MENU CRUD FOR A GIVEN RESTAURANT (superadmin only) ---
async function getRestaurantMenu(req, res) {
    try {
        const items = await MenuItem.find({ restaurant_id: req.params.id });
        res.json(items);
    } catch (error) {
        console.error("Menü Getirme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// Body arrives as multipart/form-data (superadmin form can attach a photo),
// so `tags` is a comma-separated string here, not an array.
async function addMenuItem(req, res) {
    const { name, description, price, category, tags } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: "name ve category zorunlu" });
    }

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        let image;
        if (req.file) {
            image = await uploadImageBuffer(req.file.buffer, `gastromind/${restaurant.slug}`);
        }

        const item = await MenuItem.create({
            restaurant_id: restaurant._id,
            name,
            description,
            price: price ? Number(price) : undefined,
            image,
            category,
            tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
        });
        res.status(201).json(item);
    } catch (error) {
        console.error("Ürün Ekleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- REPLACE AN EXISTING MENU ITEM'S PHOTO (superadmin only) ---
async function updateMenuItemPhoto(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: "Bir resim dosyası gerekli" });
    }

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        const item = await MenuItem.findOne({ _id: req.params.itemId, restaurant_id: restaurant._id });
        if (!item) return res.status(404).json({ error: "Ürün bulunamadı" });

        item.image = await uploadImageBuffer(req.file.buffer, `gastromind/${restaurant.slug}`);
        await item.save();

        res.json(item);
    } catch (error) {
        console.error("Fotoğraf Güncelleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

async function deleteMenuItem(req, res) {
    try {
        await MenuItem.deleteOne({ _id: req.params.itemId, restaurant_id: req.params.id });
        res.json({ status: "success" });
    } catch (error) {
        console.error("Ürün Silme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

module.exports = {
    createRestaurant,
    listRestaurants,
    getRestaurant,
    updateOwnerCredentials,
    addCategory,
    deleteCategory,
    getRestaurantMenu,
    addMenuItem,
    updateMenuItemPhoto,
    deleteMenuItem
};
