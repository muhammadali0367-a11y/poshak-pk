"use client";

const CACHE_TTL_MS = 5 * 60 * 1000;

const brandsCache = {
  value: null,
  expiresAt: 0,
  inFlight: null,
};

function hasFreshValue(entry) {
  return entry.value !== null && Date.now() < entry.expiresAt;
}

function normalizeBrands(payload) {
  return Array.isArray(payload?.brands) ? payload.brands : [];
}

export function getBrandsCached() {
  if (hasFreshValue(brandsCache)) {
    return Promise.resolve(brandsCache.value);
  }

  if (brandsCache.inFlight) {
    return brandsCache.inFlight;
  }

  brandsCache.inFlight = fetch("/api/brands")
    .then((res) => res.json())
    .then((json) => {
      const brands = normalizeBrands(json);
      brandsCache.value = brands;
      brandsCache.expiresAt = Date.now() + CACHE_TTL_MS;
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
