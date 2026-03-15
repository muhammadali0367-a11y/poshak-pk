import { supabase } from '../supabaseClient'

const CATEGORIES = [
  "Lawn", "Pret / Ready to Wear", "Formal", "Festive / Eid",
  "Unstitched", "Luxury Pret", "Winter Collection", "Bridal",
  "Co-ords", "Kurta", "Abaya", "Shalwar Kameez"
]

// Collection-to-category mapping (same as website)
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
  if (all.includes("unstitched"))   return "Unstitched"
  if (all.includes("luxury pret"))  return "Luxury Pret"
  if (all.match(/bridal|bride|gharara|sharara|lehenga/)) return "Bridal"
  if (all.includes("abaya"))        return "Abaya"
  if (all.match(/festive|eid/))     return "Festive / Eid"
  if (all.match(/khaddar|karandi|winter/)) return "Winter Collection"
  if (all.includes("lawn"))         return "Lawn"
  if (all.match(/kurta|kurti/))     return "Kurta"
  if (all.match(/formal|evening/))  return "Formal"
  return "Pret / Ready to Wear"
}

export async function GET() {
  try {
    // Fetch enough products to fill all categories (4 per category × 12 categories)
    // We fetch 500 and distribute — fast single query
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock')
      .eq('in_stock', true)
      .limit(500)

    if (error) throw error

    // Group into categories
    const byCategory = {}
    for (const cat of CATEGORIES) byCategory[cat] = []

    for (const p of data) {
      const cat = getCategory(p.collection, p.tags, p.product_type)
      if (byCategory[cat] && byCategory[cat].length < 4) {
        byCategory[cat].push(p)
      }
    }

    return Response.json({ sections: byCategory })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
