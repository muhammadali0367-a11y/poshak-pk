import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

// Urdu/Roman Urdu to English keyword map for server-side search
const URDU_TO_ENGLISH = {
  "kala":"black","kali":"black","safed":"white","safaid":"white",
  "lal":"red","surkh":"red","neela":"blue","hara":"green",
  "gulabi":"pink","zard":"yellow","ferozi":"teal",
  "jora":"suit","libas":"dress","poshak":"dress",
  "shalwar":"shalwar","kameez":"kameez","kurta":"kurta","lawn":"lawn",
  "shaadi":"wedding","eid":"eid","dulhan":"bridal","dawat":"party",
  "sardi":"winter","karandi":"karandi","khaddar":"khaddar",
  "chiffon":"chiffon","velvet":"velvet","lawn":"lawn","silk":"silk",
}

function translateQuery(q) {
  let translated = q.toLowerCase().trim()
  for (const [urdu, english] of Object.entries(URDU_TO_ENGLISH)) {
    translated = translated.replace(new RegExp(`\\b${urdu}\\b`, 'gi'), english)
  }
  return translated
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ     = (searchParams.get('q') || '').trim()
    const page     = parseInt(searchParams.get('page') || '1')
    const brand    = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    if (!rawQ) return Response.json({ products: [], total: 0, page: 1, pages: 0 })

    // Translate Urdu/Roman Urdu to English
    const q = translateQuery(rawQ)

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    // Search across name, brand, tags, collection, product_type
    let query = supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock', { count: 'exact' })
      .or([
        `name.ilike.%${q}%`,
        `brand.ilike.%${q}%`,
        `tags.ilike.%${q}%`,
        `collection.ilike.%${q}%`,
        `product_type.ilike.%${q}%`,
        // Also search original query in case translation changed too much
        rawQ !== q ? `name.ilike.%${rawQ}%` : null,
        rawQ !== q ? `tags.ilike.%${rawQ}%`  : null,
      ].filter(Boolean).join(','))

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
