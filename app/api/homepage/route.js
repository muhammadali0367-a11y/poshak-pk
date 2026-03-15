import { supabase } from '../supabaseClient'

const CATEGORIES = [
  "Lawn", "Pret / Ready to Wear", "Formal", "Festive / Eid",
  "Unstitched", "Luxury Pret", "Winter Collection", "Bridal",
  "Co-ords", "Kurta", "Abaya", "Shalwar Kameez"
]

function getCategory(collection, tags, product_type) {
  const col = (collection || "").toLowerCase()
  const all = `${col} ${(tags||"").toLowerCase()} ${(product_type||"").toLowerCase()}`

  const MAP = [
    [["formal-pret","formal-wear","formals","semi-formal","evening-wear"], "Formal"],
    [["luxury-pret","premium-pret","signature-collection","glam"],         "Luxury Pret"],
    [["bridal","wedding-festive","wedding-collection","wedding-wear"],      "Bridal"],
    [["eid-collection","festive","festive-pret","eid-festive","eid-pret"],  "Festive / Eid"],
    [["winter-pret","khaddar-collection","karandi","winter-suits","winter-collection","winter"], "Winter Collection"],
    [["unstitched","luxury-unstitched"],                                    "Unstitched"],
    [["lawn","printed-pret-3","printed-pret-lawn","embroidered-pret-lawn"], "Lawn"],
    [["abaya"],                                                             "Abaya"],
    [["co-ord","coord-set"],                                                "Co-ords"],
    [["kurta"],                                                             "Kurta"],
    [["shalwar-kameez"],                                                    "Shalwar Kameez"],
    [["pret","ready-to-wear","rtw","casual-pret","summer-pret"],            "Pret / Ready to Wear"],
  ]
  for (const [keys, cat] of MAP) {
    if (keys.some(k => col.includes(k))) return cat
  }
  // Tags fallback
  if (all.includes("unstitched"))                      return "Unstitched"
  if (all.includes("luxury pret"))                     return "Luxury Pret"
  if (all.match(/bridal|bride|gharara|sharara|lehenga/)) return "Bridal"
  if (all.includes("abaya"))                           return "Abaya"
  if (all.match(/\bco-ord\b|coord set/))               return "Co-ords"
  if (all.match(/\bfestive\b|\beid\b/))                return "Festive / Eid"
  if (all.match(/khaddar|karandi|\bwinter\b/))         return "Winter Collection"
  if (all.includes("lawn"))                            return "Lawn"
  if (all.match(/\bkurta\b|\bkurti\b/))                return "Kurta"
  if (all.match(/shalwar|kameez/))                     return "Shalwar Kameez"
  if (all.match(/\bformal\b|evening wear/))            return "Formal"
  return "Pret / Ready to Wear"
}

export async function GET() {
  try {
    const byCategory = {}
    for (const cat of CATEGORIES) byCategory[cat] = []

    // Fetch products in batches of 1000 until all categories have 4 products
    let from = 0
    const batchSize = 1000

    while (true) {
      // Check if all categories are filled
      const allFilled = CATEGORIES.every(cat => byCategory[cat].length >= 4)
      if (allFilled) break

      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock')
        .eq('in_stock', true)
        .range(from, from + batchSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const p of data) {
        const cat = getCategory(p.collection, p.tags, p.product_type)
        if (byCategory[cat] && byCategory[cat].length < 4) {
          byCategory[cat].push(p)
        }
      }

      from += batchSize
      if (data.length < batchSize) break // last page
    }

    // Filter out empty categories
    const sections = {}
    for (const cat of CATEGORIES) {
      if (byCategory[cat].length > 0) {
        sections[cat] = byCategory[cat]
      }
    }

    return Response.json({ sections })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
