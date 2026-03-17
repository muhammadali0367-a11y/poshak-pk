import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PAGE_SIZE = 24

// Urdu/Roman Urdu → English
const URDU_TO_ENGLISH = {
  "kala":"black","kali":"black","سیاہ":"black",
  "safed":"white","safaid":"white","سفید":"white",
  "lal":"red","surkh":"red","سرخ":"red",
  "neela":"blue","نیلا":"blue","neeli":"blue",
  "hara":"green","ہرا":"green","hari":"green",
  "gulabi":"pink","گلابی":"pink",
  "zard":"yellow","زرد":"yellow",
  "ferozi":"teal","فیروزی":"teal",
  "gehra lal":"maroon","gehra":"dark",
  "jora":"suit","جوڑا":"suit",
  "libas":"dress","لباس":"dress",
  "poshak":"dress","پوشاک":"dress",
  "shalwar":"shalwar","شلوار":"shalwar",
  "kameez":"kameez","قمیض":"kameez",
  "kurta":"kurta","کرتا":"kurta",
  "lawn":"lawn","لان":"lawn",
  "shaadi":"wedding","شادی":"wedding",
  "eid":"eid","عید":"eid",
  "dulhan":"bridal","دلہن":"bridal",
  "sardi":"winter","سردی":"winter",
  "khaddar":"khaddar","karandi":"karandi",
}

// Canonical color names matching what convert.py stores in the color column
const COLOR_CANONICAL = {
  "black":["black"],"white":["white"],"red":["red"],"blue":["blue"],
  "green":["green"],"yellow":["yellow"],"pink":["pink"],"purple":["purple"],
  "orange":["orange"],"brown":["brown"],"grey":["grey","gray"],
  "beige":["beige"],"cream":["cream"],"navy":["navy blue","navy"],
  "teal":["teal","turquoise"],"maroon":["maroon"],"mustard":["mustard"],
  "rust":["rust"],"coral":["coral"],"peach":["peach"],"lilac":["lilac"],
  "lavender":["lavender"],"ivory":["ivory"],"gold":["gold"],"silver":["silver"],
  "magenta":["magenta"],"fuchsia":["fuchsia"],"multicolor":["multicolor","multi"],
  "off white":["off white"],"navy blue":["navy blue"],"hot pink":["hot pink"],
  "baby pink":["baby pink"],"dark green":["dark green"],"olive green":["olive green"],
  "bottle green":["bottle green"],"sky blue":["sky blue"],"royal blue":["royal blue"],
}

// Urdu color synonyms → canonical color
const COLOR_SYNONYMS = {
  "kala":"black","kali":"black","safed":"white","lal":"red","surkh":"red",
  "neela":"navy blue","neeli":"navy blue","hara":"green","gulabi":"pink",
  "zard":"yellow","ferozi":"teal","gehra lal":"maroon",
}

function translateQuery(q) {
  let t = q.toLowerCase().trim()
  for (const [urdu, english] of Object.entries(URDU_TO_ENGLISH)) {
    t = t.replace(new RegExp(`\\b${urdu.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'gi'), english)
  }
  return t
}

// Detect if query is purely asking for a color
function detectColor(q) {
  const lower = q.toLowerCase().trim()
  // Check Urdu synonyms first
  if (COLOR_SYNONYMS[lower]) return COLOR_SYNONYMS[lower]
  // Check canonical colors
  for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
    if (canonical === lower || variants.some(v => v === lower)) return canonical
  }
  return null
}

// Detect if query contains a color plus other terms
function extractColorFromQuery(q) {
  const lower = q.toLowerCase().trim()
  const words = lower.split(/\s+/)
  // Try multi-word colors first (e.g. "navy blue", "off white")
  for (let i = 0; i < words.length - 1; i++) {
    const twoWords = `${words[i]} ${words[i+1]}`
    if (COLOR_SYNONYMS[twoWords]) return { color: COLOR_SYNONYMS[twoWords], remaining: lower.replace(twoWords, '').trim() }
    for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
      if (canonical === twoWords || variants.some(v => v === twoWords)) return { color: canonical, remaining: lower.replace(twoWords, '').trim() }
    }
  }
  // Single word colors
  for (const word of words) {
    if (COLOR_SYNONYMS[word]) return { color: COLOR_SYNONYMS[word], remaining: lower.replace(word, '').trim() }
    for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
      if (canonical === word || variants.some(v => v === word)) return { color: canonical, remaining: lower.replace(word, '').trim() }
    }
  }
  return null
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ      = (searchParams.get('q') || '').trim()
    const page      = parseInt(searchParams.get('page') || '1')
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    if (!rawQ) return Response.json({ products: [], total: 0, page: 1, pages: 0 })

    const q    = translateQuery(rawQ)
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select(
        'id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock',
        { count: 'exact' }
      )

    // Detect pure color query (e.g. "black", "gulabi", "pink")
    const pureColor = detectColor(q)

    if (pureColor) {
      // Use the dedicated color column — exact and accurate
      query = query.ilike('color', pureColor)
    } else {
      // Check if query has a color component mixed with keywords (e.g. "black lawn suit")
      const colorExtract = extractColorFromQuery(q)

      if (colorExtract && colorExtract.remaining.length > 0) {
        // Has color + other terms — filter by color column AND search remaining terms
        query = query.ilike('color', colorExtract.color)
        const remaining = colorExtract.remaining
        const orParts = [
          `name.ilike.%${remaining}%`,
          `brand.ilike.%${remaining}%`,
          `tags.ilike.%${remaining}%`,
          `collection.ilike.%${remaining}%`,
          `product_type.ilike.%${remaining}%`,
          `fabric.ilike.%${remaining}%`,
          `occasion.ilike.%${remaining}%`,
        ]
        query = query.or(orParts.join(','))
      } else {
        // General search — no color detected, search across all fields
        const terms = [...new Set([rawQ.toLowerCase(), q])].filter(Boolean)
        const orParts = []
        for (const term of terms) {
          orParts.push(
            `name.ilike.%${term}%`,
            `brand.ilike.%${term}%`,
            `tags.ilike.%${term}%`,
            `collection.ilike.%${term}%`,
            `product_type.ilike.%${term}%`,
            `color.ilike.%${term}%`,
            `fabric.ilike.%${term}%`,
            `occasion.ilike.%${term}%`,
          )
        }
        query = query.or([...new Set(orParts)].join(','))
      }
    }

    if (brand)     query = query.ilike('brand', `%${brand}%`)
    if (min_price) query = query.gte('price', parseInt(min_price))
    if (max_price) query = query.lte('price', parseInt(max_price))

    query = query.order('created_at', { ascending: false }).range(from, to)

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
