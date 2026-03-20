import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

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
      if (canonical === twoWords || variants.some(v => v === twoWords)) return { color: canonical, remaining: lower.replace(twoWords, '').trim() }
    }
  }
  for (const word of words) {
    if (COLOR_SYNONYMS[word]) return { color: COLOR_SYNONYMS[word], remaining: lower.replace(word, '').trim() }
    for (const [canonical, variants] of Object.entries(COLOR_CANONICAL)) {
      if (canonical === word || variants.some(v => v === word)) return { color: canonical, remaining: lower.replace(word, '').trim() }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// GPT-4o mini: normalize the query into clean English search terms
// ─────────────────────────────────────────────────────────────────────────────
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
    // If GPT fails, fall back to basic translation
    return translateQuery(rawQuery)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get vector embedding for a query string
// ─────────────────────────────────────────────────────────────────────────────
async function getQueryEmbedding(text) {
  const response = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-3-small'
  })
  return response.data[0].embedding
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Pinecone and return top product IDs with scores
// ─────────────────────────────────────────────────────────────────────────────
async function vectorSearch(embedding, topK = 50) {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'poshak-products')
    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    })
    // Returns [{ id, score }, ...]
    return results.matches.map(m => ({ id: m.id, vectorScore: m.score }))
  } catch {
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword score: how well does a product match the query terms
// ─────────────────────────────────────────────────────────────────────────────
function keywordScore(product, terms) {
  const searchableText = [
    product.name,
    product.brand,
    product.tags,
    product.category,
    product.product_type,
    product.collection,
  ].join(' ').toLowerCase()

  let score = 0
  for (const term of terms) {
    if (searchableText.includes(term)) score += 1
  }
  return score / Math.max(terms.length, 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid rerank: combine vector score + keyword score
// ─────────────────────────────────────────────────────────────────────────────
function hybridRerank(products, vectorScoreMap, queryTerms) {
  return products
    .map(product => {
      const vScore = vectorScoreMap[product.id] || 0
      const kScore = keywordScore(product, queryTerms)
      const finalScore = (0.6 * vScore) + (0.4 * kScore)
      return { ...product, _score: finalScore }
    })
    .sort((a, b) => b._score - a._score)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GET handler
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQ      = (searchParams.get('q') || '').trim()
    const page      = parseInt(searchParams.get('page') || '1')
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')

    if (!rawQ) return Response.json({ products: [], total: 0, page: 1, pages: 0 })

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    // ── Step 1: Normalize query with GPT-4o mini ──────────────────────────────
    const normalizedQ = await normalizeQuery(rawQ)
    const translatedQ = translateQuery(rawQ)

    // ── Step 2: Detect color ──────────────────────────────────────────────────
    const pureColor    = detectColor(normalizedQ) || detectColor(translatedQ)
    const colorExtract = !pureColor ? (extractColorFromQuery(normalizedQ) || extractColorFromQuery(translatedQ)) : null

    // ── Step 3: Vector search via Pinecone ────────────────────────────────────
    let vectorResults = []
    let vectorScoreMap = {}
    let vectorIds = []

    try {
      const embedding = await getQueryEmbedding(normalizedQ)
      vectorResults = await vectorSearch(embedding, 50)
      vectorScoreMap = Object.fromEntries(vectorResults.map(r => [r.id, r.vectorScore]))
      vectorIds = vectorResults.map(r => r.id)
    } catch {
      // Vector search failed — fall back to keyword only
    }

    // ── Step 4: Fetch products from Supabase ──────────────────────────────────
    let products = []
    let total = 0

    if (vectorIds.length > 0) {
      // Fetch the top vector candidates first
      let vectorQuery = supabase
        .from('products')
        .select('id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock', { count: 'exact' })
        .in('id', vectorIds)

      if (brand)     vectorQuery = vectorQuery.ilike('brand', `%${brand}%`)
      if (min_price) vectorQuery = vectorQuery.gte('price', parseInt(min_price))
      if (max_price) vectorQuery = vectorQuery.lte('price', parseInt(max_price))
      if (pureColor) vectorQuery = vectorQuery.ilike('color', pureColor)
      else if (colorExtract) vectorQuery = vectorQuery.ilike('color', colorExtract.color)

      const { data: vectorData, error: vectorError } = await vectorQuery

      if (!vectorError && vectorData && vectorData.length > 0) {
        // Hybrid rerank the results
        const queryTerms = [...new Set([
          ...normalizedQ.toLowerCase().split(/\s+/),
          ...translatedQ.toLowerCase().split(/\s+/)
        ])].filter(t => t.length > 2)

        const reranked = hybridRerank(vectorData, vectorScoreMap, queryTerms)

        // Paginate after reranking
        total = reranked.length
        products = reranked.slice(from, to + 1)
      }
    }

    // ── Step 5: Fallback to keyword search if vector returned nothing ─────────
    if (products.length === 0) {
      let fallbackQuery = supabase
        .from('products')
        .select('id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock', { count: 'exact' })

      if (pureColor) {
        fallbackQuery = fallbackQuery.ilike('color', pureColor)
      } else if (colorExtract && colorExtract.remaining.length > 0) {
        fallbackQuery = fallbackQuery.ilike('color', colorExtract.color)
        const remaining = colorExtract.remaining
        fallbackQuery = fallbackQuery.or([
          `name.ilike.%${remaining}%`,
          `brand.ilike.%${remaining}%`,
          `tags.ilike.%${remaining}%`,
          `collection.ilike.%${remaining}%`,
          `product_type.ilike.%${remaining}%`,
          `fabric.ilike.%${remaining}%`,
          `occasion.ilike.%${remaining}%`,
        ].join(','))
      } else {
        const terms = [...new Set([rawQ.toLowerCase(), normalizedQ.toLowerCase(), translatedQ])].filter(Boolean)
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
        fallbackQuery = fallbackQuery.or([...new Set(orParts)].join(','))
      }

      if (brand)     fallbackQuery = fallbackQuery.ilike('brand', `%${brand}%`)
      if (min_price) fallbackQuery = fallbackQuery.gte('price', parseInt(min_price))
      if (max_price) fallbackQuery = fallbackQuery.lte('price', parseInt(max_price))

      fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).range(from, to)

      const { data, error, count } = await fallbackQuery
      if (error) throw error

      products = data || []
      total = count || 0
    }

    return Response.json({
      products,
      total,
      page,
      pages: Math.ceil(total / PAGE_SIZE),
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
