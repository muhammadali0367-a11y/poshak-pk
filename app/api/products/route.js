import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

// Category filters built from ACTUAL product_type and collection values in Supabase.
// Strategy: use OR across product_type + tags only.
// Collections are brand-specific internal codes — too unreliable for matching.
// We use tags which are consistent across brands.
//
// IMPORTANT: ilike with % is a contains match — keep keywords specific enough
// that they don't accidentally match other categories.

const CATEGORY_FILTERS = {

  "Unstitched": {
    product_types: ["Unstitched", "BT-UNSTITCH", "BT-UNSTITCHED", "Essential Unstitched",
                    "Unstitched Printed", "Unstitched Embroidered", "Women Fabric",
                    "Jacquard", "MORBAGH", "BT-MORBAGH"],
    tags:          ["unstitched", "fabric"],
    collections:   ["unstitched", "rgroup-unstitched", "shop-by-season-unstitched",
                    "designer-picks-unstitched", "hot-sellers-unstitched",
                    "new-in-unstitched", "unstitched-new-arrivals", "na-unstitched"],
  },

  "Pret / Ready to Wear": {
    product_types: ["PRET", "Stitched", "RTW", "Essential Pret", "Ready To Wear",
                    "SHIRT, TROUSER & DUPATTA", "SHIRT & TROUSER", "SHIRT & DUPATTA",
                    "SHIRT", "Rozana", "M.Basics Casuals", "Casual", "1 PC",
                    "2 PC", "3 PC", "SHIRT & CULOTTE", "Printed", "Embroidered",
                    "Solid", "Special Price", "OLDSSEASON"],
    tags:          ["pret", "ready to wear", "stitched"],
    collections:   ["003-Ready-To-Wear", "pret", "ready-to-wear", "essential-pret",
                    "embroidered-pret", "ready-to-wear-printed", "everyday-pret",
                    "embroidered-daily-wear", "flaws-all-pret-view", "eid-pret-2026",
                    "new-in-ready-to-wear", "1pc-us-pret", "1-piece-essential"],
  },

  "Luxury Pret": {
    product_types: ["LUXURY-PRET"],
    tags:          ["luxury pret", "luxury"],
    collections:   ["rgroup-luxrypret-other", "rgroup-luxury-pret", "luxury-pret-batch",
                    "batch-01-unstitched-luxury"],
  },

  "Kurta": {
    product_types: ["KURTI", "Boho"],
    tags:          ["kurta", "kurti"],
    collections:   ["kurta", "kurti", "boho"],
  },

  "Co-ords": {
    product_types: ["Co-ords"],
    tags:          ["co-ord set", "co-ord", "coord"],
    collections:   ["co-ord", "coord"],
  },

  "Lawn": {
    product_types: [],
    tags:          ["lawn"],
    collections:   ["lawn-2026", "lawn"],
  },

  "Festive / Eid": {
    product_types: [],
    tags:          ["festive", "eid"],
    collections:   ["eid-pret-2026", "eid-collection"],
  },

  "Winter Collection": {
    product_types: [],
    tags:          ["khaddar", "karandi", "winter"],
    collections:   ["winter", "khaddar", "karandi"],
  },

  "Formal": {
    product_types: [],
    tags:          ["formal", "semi-formal"],
    collections:   ["formal", "semi-formal"],
  },

  "Bridal": {
    product_types: [],
    tags:          ["bridal", "wedding", "gharara", "sharara", "lehenga"],
    collections:   ["bridal", "wedding"],
  },

  "Abaya": {
    product_types: [],
    tags:          ["abaya"],
    collections:   ["abaya"],
  },

  "Shalwar Kameez": {
    product_types: [],
    tags:          ["shalwar kameez"],
    collections:   ["shalwar-kameez"],
  },
}

// Product types that should NEVER appear regardless of category
// These are western/standalone items that slipped through convert.py
const EXCLUDED_PRODUCT_TYPES = [
  "Western", "PRET LOWERS", "Salt",
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page      = parseInt(searchParams.get('page') || '1')
    const category  = searchParams.get('category') || ''
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')
    const color     = searchParams.get('color') || ''
    const fabric    = searchParams.get('fabric') || ''
    const occasion  = searchParams.get('occasion') || ''

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select(
        'id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock',
        { count: 'exact' }
      )

    // Always exclude western/standalone product types
    for (const ex of EXCLUDED_PRODUCT_TYPES) {
      query = query.not('product_type', 'ilike', ex)
    }

    // Category filter — OR across product_types + tags + collections
    if (category && category !== 'All' && CATEGORY_FILTERS[category]) {
      const f = CATEGORY_FILTERS[category]
      const orParts = []

      // product_type: exact case-insensitive match (eq via ilike without %)
      for (const k of f.product_types) {
        orParts.push(`product_type.ilike.${k}`)
      }
      // tags: contains match
      for (const k of f.tags) {
        orParts.push(`tags.ilike.%${k}%`)
      }
      // collections: contains match (collection handles are long strings)
      for (const k of f.collections) {
        orParts.push(`collection.ilike.%${k}%`)
      }

      if (orParts.length > 0) {
        query = query.or(orParts.join(','))
      }
    }

    if (color    && color    !== 'All' && color    !== 'All Colors') query = query.ilike('color',    `%${color}%`)
    if (fabric   && fabric   !== 'All Fabrics')                      query = query.ilike('fabric',   `%${fabric}%`)
    if (occasion && occasion !== 'All Occasions')                    query = query.ilike('occasion', `%${occasion}%`)

    if (brand)     query = query.ilike('brand', `%${brand}%`)
    if (min_price) query = query.gte('price', parseInt(min_price))
    if (max_price) query = query.lte('price', parseInt(max_price))

    query = query.order('price', { ascending: false }).range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return Response.json({
      products: data || [],
      total:    count || 0,
      page,
      pages:    Math.ceil((count || 0) / PAGE_SIZE),
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
