import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page       = parseInt(searchParams.get('page') || '1')
    const brand      = searchParams.get('brand') || ''
    const collection = searchParams.get('collection') || ''
    const in_stock   = searchParams.get('in_stock')
    const min_price  = searchParams.get('min_price')
    const max_price  = searchParams.get('max_price')

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock', { count: 'exact' })

    if (brand)      query = query.ilike('brand', `%${brand}%`)
    if (collection) query = query.ilike('collection', `%${collection}%`)
    if (in_stock === 'true') query = query.eq('in_stock', true)
    if (min_price)  query = query.gte('price', parseInt(min_price))
    if (max_price)  query = query.lte('price', parseInt(max_price))

    query = query
      .order('id')
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error

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
