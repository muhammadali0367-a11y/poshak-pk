import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24
const PRODUCTS_CACHE_TTL_MS = 10 * 60 * 1000
const SUCCESS_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}

// Global exclusions — never show these product_types anywhere
const EXCLUDED_PRODUCT_TYPES = ["Western", "PRET LOWERS", "Salt"]

const productsCache = new Map()
const productsInFlight = new Map()

async function fetchProductsPayload(request) {
  const { searchParams } = new URL(request.url)
  const page      = parseInt(searchParams.get('page') || '1')
  const category  = searchParams.get('category') || ''
  const brand     = searchParams.get('brand') || ''
  const min_price = searchParams.get('min_price')
  const max_price = searchParams.get('max_price')
  const color     = searchParams.get('color') || ''
  const fabric    = searchParams.get('fabric') || ''
  const occasion  = searchParams.get('occasion') || ''
  const sort      = searchParams.get('sort') || 'price_desc'

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select(
      'id, name, brand, price, original_price, product_type, tags, collection, category, color, fabric, occasion, image_url, product_url',
      { count: 'planned' }
    )
    .eq('in_stock', true)

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

  // Sort
  if      (sort === 'price_asc')  query = query.order('price', { ascending: true })
  else if (sort === 'price_desc') query = query.order('price', { ascending: false })
  else if (sort === 'name_asc')   query = query.order('name',  { ascending: true })
  else if (sort === 'name_desc')  query = query.order('name',  { ascending: false })
  else if (sort === 'newest')     query = query.order('created_at', { ascending: false })
  else                            query = query.order('price', { ascending: false })

  query = query.range(from, to)

  const { data, error, count } = await query
  if (error) throw error

  return {
    products: data || [],
    total:    count || 0,
    page,
    pages:    Math.ceil((count || 0) / PAGE_SIZE),
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const logMeta = {
      url: request.url,
      timestamp: new Date().toISOString(),
      filters: {
        page: searchParams.get('page') || '1',
        category: searchParams.get('category') || '',
        brand: searchParams.get('brand') || '',
        min_price: searchParams.get('min_price') || '',
        max_price: searchParams.get('max_price') || '',
        color: searchParams.get('color') || '',
        fabric: searchParams.get('fabric') || '',
        occasion: searchParams.get('occasion') || '',
        sort: searchParams.get('sort') || 'price_desc',
      },
    }

    const cacheKey = request.url
    const now = Date.now()
    const cached = productsCache.get(cacheKey)
    if (cached && now < cached.expiresAt && Array.isArray(cached.payload.products) && cached.payload.products.length > 0) {
      return Response.json(cached.payload, { headers: SUCCESS_CACHE_HEADERS })
    }

    let inFlight = productsInFlight.get(cacheKey)
    if (!inFlight) {
      inFlight = (async () => {
        let payload = await fetchProductsPayload(request)
        if (payload.products.length === 0) {
          console.warn('products API returned empty products, retrying once:', logMeta)
          payload = await fetchProductsPayload(request)
        }
        if (payload.products.length === 0) {
          console.warn('products API returned empty products after retry:', logMeta)
          return payload
        }
        productsCache.set(cacheKey, {
          payload,
          expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
        })
        return payload
      })()
      productsInFlight.set(cacheKey, inFlight)
    }

    const payload = await inFlight
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      return Response.json(payload, { headers: SUCCESS_CACHE_HEADERS })
    }
    return Response.json(payload)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  } finally {
    productsInFlight.delete(request.url)
  }
}
