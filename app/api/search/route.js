import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PAGE_SIZE = 24
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000
const SUCCESS_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
}
const searchCache = new Map()
const searchInFlight = new Map()

const URDU_TO_ENGLISH = {
  "kala":"black","kali":"black","safed":"white","safaid":"white",
  "lal":"red","surkh":"red","neela":"blue","neeli":"blue",
  "hara":"green","hari":"green","gulabi":"pink","zard":"yellow",
  "ferozi":"teal","gehra lal":"maroon","jora":"suit","libas":"dress",
  "poshak":"dress","shalwar":"shalwar","kameez":"kameez","kurta":"kurta",
  "lawn":"lawn","shaadi":"wedding","eid":"eid","dulhan":"bridal",
  "sardi":"winter","khaddar":"khaddar","karandi":"karandi",
}

const COLOR_SYNONYMS = {
  "kala":"black","kali":"black","safed":"white","lal":"red","surkh":"red",
  "neela":"navy blue","neeli":"navy blue","hara":"green","gulabi":"pink",
  "zard":"yellow","ferozi":"teal","gehra lal":"maroon",
}

const COLOR_CANONICAL = {
  "black":["black"],"white":["white"],"red":["red"],"blue":["blue"],
  "green":["green"],"yellow":["yellow"],"pink":["pink"],"purple":["purple"],
  "orange":["orange"],"brown":["brown"],"grey":["grey","gray"],
  "beige":["beige"],"cream":["cream"],"navy":["navy blue","navy"],
  "teal":["teal","turquoise"],"maroon":["maroon"],"mustard":["mustard"],
  "rust":["rust"],"coral":["coral"],"peach":["peach"],"lilac":["lilac"],
  "lavender":["lavender"],"ivory":["ivory"],"gold":["gold"],"silver":["silver"],
  "multicolor":["multicolor","multi"],"off white":["off white"],
  "navy blue":["navy blue"],"hot pink":["hot pink"],"baby pink":["baby pink"],
  "dark green":["dark green"],"olive green":["olive green"],"sky blue":["sky blue"],
}

function translateQuery(q) {
  let t = q.toLowerCase().trim()
  for (const [urdu, english] of Object.entries(URDU_TO_ENGLISH)) {
    t = t.replace(new RegExp(`\\b${urdu.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'gi'), english)
  }
  return t
}

function detectColor(q) {
  const lower = q.toLowerCase().trim()
  if (COLOR_SYNONYMS[lower]) return COLOR_SYNONYMS[lower]
  for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
    if (canonical === lower || variants.some(v => v === lower)) return canonical
  }
  return null
}

function extractColorFromQuery(q) {
  const lower = q.toLowerCase().trim()
  const words = lower.split(/\s+/)
  for (let i = 0; i < words.length - 1; i++) {
    const twoWords = `${words[i]} ${words[i+1]}`
    if (COLOR_SYNONYMS[twoWords]) return { color: COLOR_SYNONYMS[twoWords], remaining: lower.replace(twoWords, '').trim() }
    for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
      if (canonical === twoWords || variants.some(v => v === twoWords))
        return { color: canonical, remaining: lower.replace(twoWords, '').trim() }
    }
  }
  for (const word of words) {
    if (COLOR_SYNONYMS[word]) return { color: COLOR_SYNONYMS[word], remaining: lower.replace(word, '').trim() }
    for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
      if (canonical === word || variants.some(v => v === word))
        return { color: canonical, remaining: lower.replace(word, '').trim() }
    }
  }
  return null
}

async function normalizeQuery(rawQuery) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You are a search query normalizer for a Pakistani women's fashion website.
Convert the user's query into clean English fashion search terms.
Rules:
- Translate Urdu/Roman Urdu to English
- Fix typos and expand abbreviations
- Keep it concise (max 8 words)
- Preserve color, fabric, category, and occasion keywords
- Return ONLY the normalized query, nothing else
Examples:
"kuch acha sa lawn" → "lawn kurta casual summer"
"shaadi ka jora" → "wedding suit formal"
"gulabi lawn kurta" → "pink lawn kurta"
"sardi ke kapray" → "winter clothes warm"`,
        },
        { role: 'user', content: rawQuery }
      ]
    })
    return response.choices[0].message.content.trim()
  } catch {
    return translateQuery(rawQuery)
  }
}

async function getQueryEmbedding(text) {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small'
  })
  return response.data[0].embedding
}

// ─────────────────────────────────────────────────────────────────────────────
// pgvector similarity search via Supabase RPC function
// ─────────────────────────────────────────────────────────────────────────────
async function vectorSearch(embedding, { brand, color, min_price, max_price, topK = 50 }) {
  try {
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_count:     topK,
      filter_brand:    brand     || null,
      filter_color:    color     || null,
      min_price:       min_price ? parseInt(min_price) : null,
      max_price:       max_price ? parseInt(max_price) : null,
    })
    if (error) throw error
    return data || []
  } catch (e) {
    console.error('pgvector search error:', e)
    return []
  }
}

function keywordScore(product, terms) {
  const searchableText = [
    product.name, product.brand, product.tags,
    product.category, product.product_type,
    product.collection,
  ].join(' ').toLowerCase()

  let score = 0
  for (const term of terms) {
    if (searchableText.includes(term)) score += 1
  }
  return score / Math.max(terms.length, 1)
}

function hybridRerank(products, queryTerms) {
  return products
    .map(product => {
      const vScore = product.similarity || 0
      const kScore = keywordScore(product, queryTerms)
      const finalScore = (0.6 * vScore) + (0.4 * kScore)
      return { ...product, _score: finalScore }
    })
    .sort((a, b) => b._score - a._score)
}

async function fetchSearchPayload(request) {
    const { searchParams } = new URL(request.url)
    const rawQ      = (searchParams.get('q') || '').trim()
    const page      = parseInt(searchParams.get('page') || '1')
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    if (!rawQ) return { products: [], total: 0, page: 1, pages: 0 }

    const from = (page - 1) * PAGE_SIZE

    // ── Step 1: Normalize query ───────────────────────────────────────────────
    const normalizedQ = await normalizeQuery(rawQ)
    const translatedQ = translateQuery(rawQ)

    // ── Step 2: Detect color ──────────────────────────────────────────────────
    const pureColor    = detectColor(normalizedQ) || detectColor(translatedQ)
    const colorExtract = !pureColor
      ? (extractColorFromQuery(normalizedQ) || extractColorFromQuery(translatedQ))
      : null
    const detectedColor = pureColor || colorExtract?.color || null

    // ── Step 3: Vector search via pgvector ────────────────────────────────────
    let products = []
    let total = 0

    try {
      const embedding = await getQueryEmbedding(normalizedQ)
      const vectorResults = await vectorSearch(embedding, {
        brand, color: detectedColor, min_price, max_price, topK: 100
      })
      const inStockVectorResults = vectorResults.filter(p => p.in_stock !== false)

      if (inStockVectorResults.length > 0) {
        const queryTerms = [...new Set([
          ...normalizedQ.toLowerCase().split(/\s+/),
          ...translatedQ.toLowerCase().split(/\s+/)
        ])].filter(t => t.length > 2)

        const reranked = hybridRerank(inStockVectorResults, queryTerms)
        total = reranked.length
        products = reranked.slice(from, from + PAGE_SIZE)
      }
    } catch (e) {
      console.error('Vector search failed:', e)
    }

    // ── Step 4: Keyword fallback if vector returned nothing ───────────────────
    if (products.length === 0) {
      let q = supabase
        .from('products')
        .select('id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock', { count: 'exact' })
        .eq('in_stock', true)

      if (pureColor) {
        q = q.ilike('color', pureColor)
      } else if (colorExtract?.remaining) {
        q = q.ilike('color', colorExtract.color)
        const rem = colorExtract.remaining
        q = q.or([
          `name.ilike.%${rem}%`,
          `brand.ilike.%${rem}%`,
          `tags.ilike.%${rem}%`,
          `collection.ilike.%${rem}%`,
          `product_type.ilike.%${rem}%`,
          `fabric.ilike.%${rem}%`,
        ].join(','))
      } else {
        const terms = [...new Set([rawQ, normalizedQ, translatedQ])]
          .filter(Boolean)
          .map(t => t.toLowerCase())
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
          )
        }
        q = q.or([...new Set(orParts)].join(','))
      }

      if (brand)     q = q.ilike('brand', `%${brand}%`)
      if (min_price) q = q.gte('price', parseInt(min_price))
      if (max_price) q = q.lte('price', parseInt(max_price))

      q = q.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)

      const { data, error, count } = await q
      if (error) throw error

      products = data || []
      total = count || 0
    }

    return {
      products,
      total,
      page,
      pages: Math.ceil(total / PAGE_SIZE),
    }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const logMeta = {
      url: request.url,
      timestamp: new Date().toISOString(),
      search: {
        q: (searchParams.get('q') || '').trim(),
        page: searchParams.get('page') || '1',
        brand: searchParams.get('brand') || '',
        min_price: searchParams.get('min_price') || '',
        max_price: searchParams.get('max_price') || '',
      },
    }

    const cacheKey = request.url
    const now = Date.now()
    const cached = searchCache.get(cacheKey)
    if (cached && now < cached.expiresAt && Array.isArray(cached.payload.products) && cached.payload.products.length > 0) {
      return Response.json(cached.payload, { headers: SUCCESS_CACHE_HEADERS })
    }

    let inFlight = searchInFlight.get(cacheKey)
    if (!inFlight) {
      inFlight = (async () => {
        let payload = await fetchSearchPayload(request)
        if (payload.products.length === 0) {
          console.warn('search API returned empty products, retrying once:', logMeta)
          payload = await fetchSearchPayload(request)
        }
        if (payload.products.length === 0) {
          console.warn('search API returned empty products after retry:', logMeta)
          return payload
        }
        searchCache.set(cacheKey, {
          payload,
          expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        })
        return payload
      })()
      searchInFlight.set(cacheKey, inFlight)
    }

    const payload = await inFlight
    if (Array.isArray(payload.products) && payload.products.length > 0) {
      return Response.json(payload, { headers: SUCCESS_CACHE_HEADERS })
    }
    return Response.json(payload)
  } catch (err) {
    console.error('Search error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  } finally {
    searchInFlight.delete(request.url)
  }
}
