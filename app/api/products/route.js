import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

// Maps website category → what to search in collection + product_type + tags
// Based on actual data in Supabase (currently Ethnic + future brands)
const CATEGORY_FILTERS = {
  "Unstitched": {
    product_types: ["unstitched"],
    collections:   ["unstitched"],
    tags:          ["unstitched"],
  },
  "Bridal": {
    product_types: ["boutique", "bridal", "couture", "wedding"],
    collections:   ["bridal", "wedding", "boutique"],
    tags:          ["bridal", "wedding", "gharara", "sharara", "lehenga"],
  },
  "Formal": {
    product_types: ["semi-formal", "formal", "evening"],
    collections:   ["formal", "semi-formal", "evening"],
    tags:          ["semi-formal", "formal wear", "evening"],
  },
  "Luxury Pret": {
    product_types: ["luxury", "premium", "signature", "glam"],
    collections:   ["luxury-pret", "premium", "signature", "glam"],
    tags:          ["luxury pret", "premium"],
  },
  "Festive / Eid": {
    product_types: ["festive", "eid"],
    collections:   ["festive", "eid"],
    tags:          ["festive", "eid"],
  },
  "Winter Collection": {
    product_types: ["khaddar", "karandi", "winter", "fleece"],
    collections:   ["winter", "khaddar", "karandi"],
    tags:          ["khaddar", "karandi", "winter"],
  },
  "Lawn": {
    product_types: ["lawn"],
    collections:   ["lawn"],
    tags:          ["lawn"],
  },
  "Co-ords": {
    product_types: ["co-ord", "coord"],
    collections:   ["co-ord", "coord"],
    tags:          ["co-ord set", "co-ord"],
  },
  "Kurta": {
    product_types: ["boho", "kurti", "kurta", "basic"],
    collections:   ["kurta", "kurti", "boho"],
    tags:          ["kurti", "kurta", "boho"],
  },
  "Abaya": {
    product_types: ["abaya"],
    collections:   ["abaya"],
    tags:          ["abaya"],
  },
  "Shalwar Kameez": {
    product_types: ["shalwar"],
    collections:   ["shalwar-kameez"],
    tags:          ["shalwar kameez"],
  },
  "Pret / Ready to Wear": {
    product_types: ["pret", "ready", "casual", "special price", "studio", "western"],
    collections:   ["pret", "ready-to-wear", "women-eastern", "women-view", "casual", "between-casual", "flaws-all-pret"],
    tags:          ["pret", "ready to wear"],
  },
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page      = parseInt(searchParams.get('page') || '1')
    const category  = searchParams.get('category') || ''
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select(
        'id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock',
        { count: 'exact' }
      )

    // Build category filter using OR across collection + product_type + tags
    if (category && category !== 'All' && CATEGORY_FILTERS[category]) {
      const f = CATEGORY_FILTERS[category]
      const orParts = [
        ...f.collections.map(k  => `collection.ilike.%${k}%`),
        ...f.product_types.map(k => `product_type.ilike.%${k}%`),
        ...f.tags.map(k          => `tags.ilike.%${k}%`),
      ]
      query = query.or(orParts.join(','))
    }

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
