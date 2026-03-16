import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PAGE_SIZE = 24

// Urdu/Roman Urdu to English translations
const URDU_TO_ENGLISH = {
  "kala":"black","kali":"black","سیاہ":"black",
  "safed":"white","safaid":"white","سفید":"white",
  "lal":"red","surkh":"red","سرخ":"red",
  "neela":"blue","نیلا":"blue",
  "hara":"green","ہرا":"green",
  "gulabi":"pink","گلابی":"pink",
  "zard":"yellow","زرد":"yellow",
  "ferozi":"teal","فیروزی":"teal",
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
}

// Color keywords — if query is ONLY a color word, filter strictly by color
const COLOR_KEYWORDS = {
  "black":["black","noir","charcoal","jet"],
  "white":["white","ivory","off-white","offwhite","cream"],
  "red":["red","crimson","scarlet","maroon","ruby"],
  "maroon":["maroon","wine","burgundy","dark red"],
  "pink":["pink","blush","rose","baby pink","hot pink"],
  "blue":["blue","navy","cobalt","indigo","royal blue"],
  "navy":["navy","dark blue","midnight"],
  "green":["green","mint","sage","emerald","olive","khaki","army green"],
  "yellow":["yellow","mustard","gold","golden"],
  "teal":["teal","turquoise","aqua","ferozi","cyan"],
  "orange":["orange","rust","burnt orange","tangerine"],
  "purple":["purple","violet","lavender","lilac","plum","mauve"],
  "grey":["grey","gray","silver","charcoal","ash","slate"],
  "beige":["beige","nude","skin","champagne","camel","off white","cream","ivory"],
  "brown":["brown","chocolate","tan","caramel"],
  "multi":["multi","printed","floral","digital","abstract","colorful"],
}

function translateQuery(q) {
  let t = q.toLowerCase().trim()
  for (const [urdu, english] of Object.entries(URDU_TO_ENGLISH)) {
    t = t.replace(new RegExp(`\\b${urdu}\\b`, 'gi'), english)
  }
  return t
}

function getColorVariants(word) {
  for (const [color, variants] of Object.entries(COLOR_KEYWORDS)) {
    if (color === word || variants.includes(word)) {
      return variants
    }
  }
  return null
}

function isColorOnlyQuery(q) {
  const words = q.toLowerCase().trim().split(/\s+/)
  if (words.length > 2) return null
  const combined = words.join(" ")
  // Check single word
  for (const [color, variants] of Object.entries(COLOR_KEYWORDS)) {
    if (color === combined || variants.includes(combined)) return combined
  }
  // Check each word
  for (const w of words) {
    for (const [color, variants] of Object.entries(COLOR_KEYWORDS)) {
      if (color === w || variants.includes(w)) return w
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

    const q           = translateQuery(rawQ)
    const from        = (page - 1) * PAGE_SIZE
    const to          = from + PAGE_SIZE - 1
    const colorMatch  = isColorOnlyQuery(q)

    let query = supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock', { count: 'exact' })

    if (colorMatch) {
      // Strict color search — only show products where color keywords appear in name or tags
      const variants = getColorVariants(colorMatch) || [colorMatch]
      const colorOr = variants.map(v => `name.ilike.%${v}%,tags.ilike.%${v}%`).join(',')
      query = query.or(colorOr)
    } else {
      // General search across all fields
      const terms = [rawQ, q].filter((v, i, a) => a.indexOf(v) === i) // dedupe
      const orParts = []
      for (const term of terms) {
        orParts.push(
          `name.ilike.%${term}%`,
          `brand.ilike.%${term}%`,
          `tags.ilike.%${term}%`,
          `collection.ilike.%${term}%`,
          `product_type.ilike.%${term}%`
        )
      }
      query = query.or([...new Set(orParts)].join(','))
    }

    if (brand)     query = query.ilike('brand', brand)
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
