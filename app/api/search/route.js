import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q        = (searchParams.get('q') || '').trim()
    const page     = parseInt(searchParams.get('page') || '1')
    const brand    = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    if (!q) {
      return Response.json({ products: [], total: 0, page: 1, pages: 0 })
    }

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    // Use Postgres full text search on name + brand + tags
    let query = supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock', { count: 'exact' })
      .textSearch('name', q, { type: 'websearch', config: 'english' })

    if (brand)     query = query.ilike('brand', `%${brand}%`)
    if (min_price) query = query.gte('price', parseInt(min_price))
    if (max_price) query = query.lte('price', parseInt(max_price))

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) {
      // Fallback to simple ilike if full text search fails
      let fallback = supabase
        .from('products')
        .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock', { count: 'exact' })
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%,tags.ilike.%${q}%,collection.ilike.%${q}%`)
        .range(from, to)

      const { data: fbData, error: fbErr, count: fbCount } = await fallback
      if (fbErr) throw fbErr

      return Response.json({
        products: fbData,
        total: fbCount,
        page,
        pages: Math.ceil(fbCount / PAGE_SIZE),
      })
    }

    return Response.json({
      products: data,
      total: count,
      page,
      pages: Math.ceil(count / PAGE_SIZE),
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
