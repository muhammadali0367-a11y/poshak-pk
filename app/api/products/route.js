import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

// Global exclusions — never show these product_types anywhere
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
        'id, name, brand, price, original_price, product_type, tags, collection, category, color, fabric, occasion, image_url, product_url, in_stock',
        { count: 'exact' }
      )

    // Always exclude western/standalone product types
    for (const ex of EXCLUDED_PRODUCT_TYPES) {
      query = query.not('product_type', 'ilike', ex)
    }

    // Category filter — use dedicated category column (exact match)
    if (category && category !== 'All') {
      query = query.eq('category', category)
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
