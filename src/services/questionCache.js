// src/services/questionCache.js
// In-memory cache for AI-generated recommend-dish questions, keyed by
// (restaurant_id, tag pair). Repeat customers hitting the same split within the
// TTL get the cached question instead of triggering a fresh OpenAI call.
// Resets on server restart — fine for a single-instance deployment; if this ever
// runs across multiple instances, swap this for a DB-backed cache.

const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — long enough to catch a dining service, not stale into tomorrow

const cache = new Map();

function keyFor(restaurantId, tagA, tagB) {
    const sorted = [tagA, tagB].sort().join('|');
    return `${restaurantId}:${sorted}`;
}

function getCachedQuestion(restaurantId, tagA, tagB) {
    const key = keyFor(restaurantId, tagA, tagB);
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setCachedQuestion(restaurantId, tagA, tagB, questionData) {
    const key = keyFor(restaurantId, tagA, tagB);
    cache.set(key, { value: questionData, expiresAt: Date.now() + TTL_MS });
}

module.exports = { getCachedQuestion, setCachedQuestion };
