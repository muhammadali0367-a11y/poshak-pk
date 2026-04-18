import { supabase } from '@/app/lib/supabase'

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
  const page          = parseInt(searchParams.get('page') || '1')
  const main_category = searchParams.get('main_category') || ''
  const stitch_type   = searchParams.get('stitch_type') || ''
  const tier          = searchParams.get('tier') || ''
  const brand         = searchParams.get('brand') || ''
  const min_price     = searchParams.get('min_price')
  const max_price     = searchParams.get('max_price')
  const color         = searchParams.get('color') || ''
  const fabric        = searchParams.get('fabric') || ''
  const occasion      = searchParams.get('occasion') || ''
  const piece_count   = searchParams.get('piece_count') || ''
  const in_stock_raw  = searchParams.get('in_stock')
  const sort          = searchParams.get('sort') || 'price_desc'

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Parse in_stock: default to true when caller omits the param
  let in_stock_filter = true
  if (in_stock_raw === 'false') in_stock_filter = false
  else if (in_stock_raw === 'true') in_stock_filter = true
  // else: param not supplied — keep default true

  let query = supabase
    .from('products')
    .select(
      'id, name, brand, price, original_price, product_type, tags, collection, main_category, stitch_type, tier, color, fabric, occasion, piece_count, in_stock, image_url, product_url',
      { count: 'planned' }
    )
    .eq('in_stock', in_stock_filter)

  // Always exclude western/standalone product types (single IN filter)
  query = query.not('product_type', 'in', `("${EXCLUDED_PRODUCT_TYPES.join('","')}")`)

  if (main_category) query = query.eq('main_category', main_category)
  if (stitch_type)   query = query.eq('stitch_type',   stitch_type)
  if (tier)          query = query.eq('tier',           tier)

  if (color    && color    !== 'All' && color    !== 'All Colors') query = query.eq('color',    color.toLowerCase())
  if (fabric   && fabric   !== 'All Fabrics')                      query = query.eq('fabric',   fabric.toLowerCase())
  if (occasion && occasion !== 'All Occasions')                    query = query.eq('occasion', occasion.toLowerCase())
  if (brand)                                                        query = query.eq('brand',    brand)

  const parsedPieceCount = parseInt(piece_count)
  if (!isNaN(parsedPieceCount) && parsedPieceCount > 0) query = query.eq('piece_count', parsedPieceCount)

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
        page:          searchParams.get('page') || '1',
        main_category: searchParams.get('main_category') || '',
        stitch_type:   searchParams.get('stitch_type') || '',
        tier:          searchParams.get('tier') || '',
        brand:         searchParams.get('brand') || '',
        min_price:     searchParams.get('min_price') || '',
        max_price:     searchParams.get('max_price') || '',
        color:         searchParams.get('color') || '',
        fabric:        searchParams.get('fabric') || '',
        occasion:      searchParams.get('occasion') || '',
        piece_count:   searchParams.get('piece_count') || '',
        in_stock:      searchParams.get('in_stock') || '',
        sort:          searchParams.get('sort') || 'price_desc',
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
