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

// --- UPDATE BRANDING: colors, font, logo (superadmin only) ---
// Body arrives as multipart/form-data (logo is an optional file).
async function updateBranding(req, res) {
    const { primary_color, secondary_color, font } = req.body;

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        if (primary_color) restaurant.branding.primary_color = primary_color;
        if (secondary_color) restaurant.branding.secondary_color = secondary_color;
        if (font) restaurant.branding.font = font;
        if (req.file) {
            restaurant.branding.logo_url = await uploadImageBuffer(req.file.buffer, `gastromind/${restaurant.slug}/branding`);
        }

        await restaurant.save();
        res.json(restaurant.branding);
    } catch (error) {
        console.error("Marka Güncelleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- CATEGORY CRUD FOR A GIVEN RESTAURANT (superadmin only) ---
// Categories are per-restaurant now — MenuItem.category should match one of these `id`s.
async function addCategory(req, res) {
    const { id, name, icon } = req.body;

    if (!id || !name) {
        return res.status(400).json({ error: "id ve name zorunlu" });
    }

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        if (restaurant.categories.some(c => c.id === id)) {
            return res.status(409).json({ error: "Bu kategori id'si zaten var" });
        }

        restaurant.categories.push({ id, name, icon });
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

// --- COMPARISON TAGS: which MenuItem.tags are safe for recommend-dish questions ---
// (superadmin only). Lists every distinct tag currently used across the restaurant's
// menu so superadmin can pick which ones make sense as an either/or comparison.
async function getComparableTags(req, res) {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        const allTags = await MenuItem.distinct('tags', { restaurant_id: restaurant._id });
        res.json({
            allTags: allTags.sort(),
            comparableTags: restaurant.comparable_tags || []
        });
    } catch (error) {
        console.error("Etiket Listeleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

async function updateComparableTags(req, res) {
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ error: "tags bir dizi olmalı" });
    }

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        restaurant.comparable_tags = tags;
        await restaurant.save();

        res.json({ comparableTags: restaurant.comparable_tags });
    } catch (error) {
        console.error("Etiket Güncelleme Hatası:", error);
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
    const { name, description, ingredients, nutrition_info, price, category, tags } = req.body;

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
            ingredients,
            nutrition_info,
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

// --- EDIT AN EXISTING MENU ITEM'S TEXT FIELDS (superadmin only) ---
async function updateMenuItem(req, res) {
    const { name, description, ingredients, nutrition_info, price, category, tags } = req.body;

    try {
        const item = await MenuItem.findOne({ _id: req.params.itemId, restaurant_id: req.params.id });
        if (!item) return res.status(404).json({ error: "Ürün bulunamadı" });

        if (name !== undefined) item.name = name;
        if (description !== undefined) item.description = description;
        if (ingredients !== undefined) item.ingredients = ingredients;
        if (nutrition_info !== undefined) item.nutrition_info = nutrition_info;
        if (price !== undefined && price !== "") item.price = Number(price);
        if (category !== undefined) item.category = category;
        if (tags !== undefined) item.tags = tags.split(',').map(t => t.trim()).filter(Boolean);

        await item.save();
        res.json(item);
    } catch (error) {
        console.error("Ürün Güncelleme Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
}

// --- TOGGLE WHETHER THE OWNER CAN EDIT THEIR OWN MENU CONTENT (superadmin only) ---
async function updatePermissions(req, res) {
    const { owner_can_edit_menu_content } = req.body;

    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: "Restoran bulunamadı" });

        if (typeof owner_can_edit_menu_content === 'boolean') {
            restaurant.owner_can_edit_menu_content = owner_can_edit_menu_content;
        }
        await restaurant.save();

        res.json({ owner_can_edit_menu_content: restaurant.owner_can_edit_menu_content });
    } catch (error) {
        console.error("Yetki Güncelleme Hatası:", error);
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
    updateBranding,
    updatePermissions,
    addCategory,
    deleteCategory,
    getComparableTags,
    updateComparableTags,
    getRestaurantMenu,
    addMenuItem,
    updateMenuItem,
    updateMenuItemPhoto,
    deleteMenuItem
};
