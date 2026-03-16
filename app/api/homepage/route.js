import { supabase } from '../supabaseClient'

const CATEGORIES = [
  "Pret / Ready to Wear", "Unstitched", "Kurta", "Formal",
  "Bridal", "Co-ords", "Winter Collection", "Festive / Eid",
  "Luxury Pret", "Lawn", "Abaya", "Shalwar Kameez"
]

const CATEGORY_FILTERS = {
  "Unstitched":           { product_types:["unstitched"],                                    collections:["unstitched"],                                            tags:["unstitched"] },
  "Bridal":               { product_types:["boutique","bridal","couture","wedding"],          collections:["bridal","wedding","boutique"],                            tags:["bridal","wedding","gharara","sharara","lehenga"] },
  "Formal":               { product_types:["semi-formal","formal","evening"],                 collections:["formal","semi-formal","evening"],                         tags:["semi-formal","formal wear"] },
  "Luxury Pret":          { product_types:["luxury","premium","signature","glam"],            collections:["luxury-pret","premium","signature","glam"],               tags:["luxury pret","premium"] },
  "Festive / Eid":        { product_types:["festive","eid"],                                  collections:["festive","eid"],                                          tags:["festive","eid"] },
  "Winter Collection":    { product_types:["khaddar","karandi","winter","fleece"],            collections:["winter","khaddar","karandi"],                             tags:["khaddar","karandi","winter"] },
  "Lawn":                 { product_types:["lawn"],                                           collections:["lawn"],                                                   tags:["lawn"] },
  "Co-ords":              { product_types:["co-ord","coord"],                                 collections:["co-ord","coord"],                                         tags:["co-ord set","co-ord"] },
  "Kurta":                { product_types:["boho","kurti","kurta","basic"],                   collections:["kurta","kurti","boho"],                                   tags:["kurti","kurta","boho"] },
  "Abaya":                { product_types:["abaya"],                                          collections:["abaya"],                                                  tags:["abaya"] },
  "Shalwar Kameez":       { product_types:["shalwar"],                                        collections:["shalwar-kameez"],                                         tags:["shalwar kameez"] },
  "Pret / Ready to Wear": { product_types:["pret","ready","casual","special price","studio"], collections:["pret","ready-to-wear","women-eastern","women-view","casual","between-casual","flaws-all-pret"], tags:["pret","ready to wear"] },
}

export async function GET() {
  try {
    const sections = {}

    // Fetch 4 products for each category in parallel — each query is independent
    // This means we get products from ALL brands, not just Ethnic
    await Promise.all(
      CATEGORIES.map(async (cat) => {
        const f = CATEGORY_FILTERS[cat]
        if (!f) return

        const orParts = [
          ...f.collections.map(k   => `collection.ilike.%${k}%`),
          ...f.product_types.map(k => `product_type.ilike.%${k}%`),
          ...f.tags.map(k          => `tags.ilike.%${k}%`),
        ]

        const { data, error } = await supabase
          .from('products')
          .select('id, name, brand, price, original_price, product_type, tags, collection, image_url, product_url, in_stock')
          .eq('in_stock', true)
          .or(orParts.join(','))
          .order('created_at', { ascending: false })
          .limit(4)

        if (!error && data && data.length > 0) {
          sections[cat] = data
        }
      })
    )

    return Response.json({ sections })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
