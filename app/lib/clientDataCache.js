"use client";

const CACHE_TTL_MS = 5 * 60 * 1000;

const brandsCache = {
  value: null,
  expiresAt: 0,
  inFlight: null,
};

function hasFreshValue(entry) {
  return Array.isArray(entry.value) && entry.value.length > 0 && Date.now() < entry.expiresAt;
}

function normalizeBrands(payload) {
  if (!Array.isArray(payload?.brands)) return [];
  const seen = new Set();
  return payload.brands.filter(b => {
    if (typeof b !== "string") return false;
    const t = b.trim();
    if (!t || seen.has(t)) return false;
    seen.add(t);
    return true;
  }).map(b => b.trim());
}

async function fetchBrandsWithRetry() {
  const first = await fetch("/api/brands")
    .then((res) => res.json())
    .then((json) => normalizeBrands(json))
    .catch(() => []);

  if (first.length > 0) return first;

  // Retry once when API returns an empty brands array.
  const second = await fetch("/api/brands")
    .then((res) => res.json())
    .then((json) => normalizeBrands(json))
    .catch(() => []);

  return second;
}

export function getBrandsCached() {
  if (hasFreshValue(brandsCache)) {
    return Promise.resolve(brandsCache.value);
  }

  if (brandsCache.inFlight) {
    return brandsCache.inFlight;
  }

  brandsCache.inFlight = fetchBrandsWithRetry()
    .then((brands) => {
      if (Array.isArray(brands) && brands.length > 0) {
        brandsCache.value = brands;
        brandsCache.expiresAt = Date.now() + CACHE_TTL_MS;
      }
      return brands;
    })
    .catch(() => {
      if (Array.isArray(brandsCache.value)) return brandsCache.value;
      return [];
    })
    .finally(() => {
      brandsCache.inFlight = null;
    });

  return brandsCache.inFlight;
}

export function setBrandsCache(brands) {
  if (!Array.isArray(brands)) return;
  brandsCache.value = brands;
  brandsCache.expiresAt = Date.now() + CACHE_TTL_MS;
}
