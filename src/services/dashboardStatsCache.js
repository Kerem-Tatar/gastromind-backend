// src/services/dashboardStatsCache.js
// In-memory cache for the full dashboardStats response, keyed by (restaurant_id, period).
// Repeat views within the TTL — tab switches, page refreshes, a second admin device —
// skip the Feedback aggregation query entirely instead of re-reading and recomputing.
// Resets on server restart — fine for a single-instance deployment; if this ever runs
// across multiple instances, swap this for a DB-backed cache.

const TTL_MS = 5 * 60 * 1000; // 5 minutes — short enough that new feedback shows up promptly

const cache = new Map();

function keyFor(restaurantId, period) {
    return `${restaurantId}:${period}`;
}

function getCachedDashboardStats(restaurantId, period) {
    const key = keyFor(restaurantId, period);
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setCachedDashboardStats(restaurantId, period, responseBody) {
    const key = keyFor(restaurantId, period);
    cache.set(key, { value: responseBody, expiresAt: Date.now() + TTL_MS });
}

module.exports = { getCachedDashboardStats, setCachedDashboardStats };
