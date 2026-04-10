import { createClient } from '@supabase/supabase-js'

const BRANDS_CACHE_TTL_MS = 10 * 60 * 1000
const brandsCache = {
  data: null,
  expiresAt: 0,
  inFlight: null,
}

export async function GET() {
  try {
    const now = Date.now()
    if (Array.isArray(brandsCache.data) && now < brandsCache.expiresAt) {
      return Response.json({ brands: brandsCache.data })
    }

    if (brandsCache.inFlight) {
      const brands = await brandsCache.inFlight
      return Response.json({ brands })
    }

    brandsCache.inFlight = (async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const allBrands = new Set()
    let from = 0

    // Paginate through ALL products to collect all unique brands
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null)
        .range(from, from + 999)

      if (error) throw error
      if (!data || data.length === 0) break

      data.forEach(r => { if (r.brand) allBrands.add(r.brand) })

      if (data.length < 1000) break  // Last page
      from += 1000
    }

      const brands = [...allBrands].sort()
      brandsCache.data = brands
      brandsCache.expiresAt = Date.now() + BRANDS_CACHE_TTL_MS
      return brands
    })()

    const brands = await brandsCache.inFlight
    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  } finally {
    brandsCache.inFlight = null
  }
}
