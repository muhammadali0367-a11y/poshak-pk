import { supabase } from '../supabaseClient'

const PAGE_SIZE = 24

const CATEGORY_FILTERS = {
  "Unstitched":           { product_types:["unstitched"],                                                collections:["unstitched"],                                                          tags:["unstitched"] },
  "Bridal":               { product_types:["boutique","bridal","couture","wedding"],                     collections:["bridal","wedding","boutique"],                                          tags:["bridal","wedding","gharara","sharara","lehenga"] },
  "Formal":               { product_types:["semi-formal","formal","evening"],                            collections:["formal","semi-formal","evening"],                                       tags:["semi-formal","formal wear","evening"] },
  "Luxury Pret":          { product_types:["luxury","premium","signature","glam"],                       collections:["luxury-pret","premium","signature","glam"],                             tags:["luxury pret","premium"] },
  "Festive / Eid":        { product_types:["festive","eid"],                                             collections:["festive","eid"],                                                        tags:["festive","eid"] },
  "Winter Collection":    { product_types:["khaddar","karandi","winter","fleece"],                       collections:["winter","khaddar","karandi"],                                            tags:["khaddar","karandi","winter"] },
  "Lawn":                 { product_types:["lawn"],                                                      collections:["lawn"],                                                                  tags:["lawn"] },
  "Co-ords":              { product_types:["co-ord","coord","studio"],                                   collections:["co-ord","coord","studio"],                                              tags:["co-ord set","co-ord"] },
  "Kurta":                { product_types:["boho","kurti","kurta","basic","rozana"],                     collections:["kurta","kurti","boho","rozana"],                                        tags:["kurti","kurta","boho"] },
  "Abaya":                { product_types:["abaya"],                                                     collections:["abaya"],                                                                tags:["abaya"] },
  "Shalwar Kameez":       { product_types:["shalwar"],                                                   collections:["shalwar-kameez"],                                                       tags:["shalwar kameez"] },
  "Pret / Ready to Wear": { product_types:["pret","ready","casual","special price","western","fusion"],  collections:["pret","ready-to-wear","women-eastern","women-view","flaws-all-pret"],   tags:["pret","ready to wear"] },
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page      = parseInt(searchParams.get('page') || '1')
    const category  = searchParams.get('category') || ''
    const brand     = searchParams.get('brand') || ''
    const min_price = searchParams.get('min_price')
    const max_price = searchParams.get('max_price')
    const color     = searchParams.get('color') || ''
    const fabric    = searchParams.get('fabric') || ''
    const occasion  = searchParams.get('occasion') || ''

    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select(
        'id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock',
        { count: 'exact' }
      )

    // Category filter
    if (category && category !== 'All' && CATEGORY_FILTERS[category]) {
      const f = CATEGORY_FILTERS[category]
      const orParts = [
        ...f.collections.map(k   => `collection.ilike.%${k}%`),
        ...f.product_types.map(k => `product_type.ilike.%${k}%`),
        ...f.tags.map(k          => `tags.ilike.%${k}%`),
      ]
      query = query.or(orParts.join(','))
    }

    // Exact column filters for color/fabric/occasion (now that we have dedicated columns)
    if (color   && color   !== 'All' && color   !== 'All Colors')   query = query.ilike('color',   `%${color}%`)
    if (fabric  && fabric  !== 'All Fabrics')                        query = query.ilike('fabric',  `%${fabric}%`)
    if (occasion && occasion !== 'All Occasions')                    query = query.ilike('occasion', `%${occasion}%`)

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
