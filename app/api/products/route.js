import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY FILTERS
//
// Strategy: match ONLY on product_type using exact case-insensitive match.
// We do NOT use tags or collections for category filtering because:
//   - Tags are brand-assigned and can contain multiple categories on one product
//     e.g. a product tagged "pret, unstitched, lawn" would match all 3 categories
//   - Collections are brand-internal codes that change over time
//   - product_type is the single most reliable signal — brands set it specifically
//
// Values taken directly from Supabase product_type column (top 40 by count).
// When new brands are added, check their product_type values and add here.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_PRODUCT_TYPES = {

  "Unstitched": [
    "Unstitched",           // Alkaram, Saya, Limelight etc
    "BT-UNSTITCH",          // Beechtree
    "BT-UNSTITCHED",        // Beechtree variant
    "Essential Unstitched", // Alkaram
    "Unstitched Printed",   // Zellbury
    "Unstitched Embroidered", // Zellbury
    "Women Fabric",         // Gul Ahmed unstitched fabrics
    "Jacquard",             // Unstitched jacquard fabric
    "MORBAGH",              // Bonanza unstitched collection
    "BT-MORBAGH",           // Beechtree unstitched
  ],

  "Pret / Ready to Wear": [
    "PRET",                     // Ethnic, Limelight
    "Stitched",                 // Alkaram stitched line
    "RTW",                      // Zellbury ready to wear
    "Essential Pret",           // Alkaram
    "Ready To Wear",            // Sana Safinaz, So Kamal
    "SHIRT, TROUSER & DUPATTA", // Ethnic 3pc
    "SHIRT & TROUSER",          // Ethnic 2pc
    "SHIRT & DUPATTA",          // Ethnic 2pc with dupatta
    "SHIRT & CULOTTE",          // Ethnic
    "SHIRT",                    // Ethnic single shirt
    "M.Basics Casuals",         // Maria B basics
    "Rozana",                   // Alkaram daily wear
    "Casual",                   // Various
    "1 PC",                     // Single piece pret
    "2 PC",                     // 2 piece pret
    "3 PC",                     // 3 piece pret
    "Special Price",            // Sale pret items
    "Printed",                  // Printed pret
    "Embroidered",              // Embroidered pret
    "Solid",                    // Solid pret
    "OLDSEASON",                // Old season pret
    "Women",                    // Generic women's pret
  ],

  "Luxury Pret": [
    "LUXURY-PRET",  // Ethnic luxury line
  ],

  "Kurta": [
    "KURTI",  // Standalone kurta/kurti
    "Boho",   // Alkaram boho kurta line
  ],

  "Co-ords": [
    "Co-ords",  // Co-ordinated sets
  ],

  // These categories have no specific product_type — use tags only
  "Lawn":             null,
  "Festive / Eid":    null,
  "Winter Collection":null,
  "Formal":           null,
  "Bridal":           null,
  "Abaya":            null,
  "Shalwar Kameez":   null,
}

// For categories with no dedicated product_type, fall back to tag matching
const CATEGORY_TAGS = {
  "Lawn":              ["lawn"],
  "Festive / Eid":     ["festive", "eid"],
  "Winter Collection": ["khaddar", "karandi", "winter"],
  "Formal":            ["formal", "semi-formal"],
  "Bridal":            ["bridal", "wedding", "lehenga", "gharara", "sharara"],
  "Abaya":             ["abaya"],
  "Shalwar Kameez":    ["shalwar kameez"],
}

// Global exclusions — these product_types should never appear anywhere
const EXCLUDED_PRODUCT_TYPES = ["Western", "PRET LOWERS", "Salt"]

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

    // Always exclude western/standalone product types globally
    for (const ex of EXCLUDED_PRODUCT_TYPES) {
      query = query.not('product_type', 'ilike', ex)
    }

    // Category filter
    if (category && category !== 'All') {
      const productTypes = CATEGORY_PRODUCT_TYPES[category]
      const tagKeywords  = CATEGORY_TAGS[category]

      if (productTypes && productTypes.length > 0) {
        // Use product_type exact matching — most reliable
        const orParts = productTypes.map(t => `product_type.ilike.${t}`)
        query = query.or(orParts.join(','))

      } else if (tagKeywords && tagKeywords.length > 0) {
        // Fall back to tag matching for categories without dedicated product_types
        const orParts = tagKeywords.map(t => `tags.ilike.%${t}%`)
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
