import { supabase } from '../supabaseClient'

const CATEGORIES = [
  "Pret / Ready to Wear", "Unstitched", "Kurta", "Formal",
  "Bridal", "Co-ords", "Winter Collection", "Festive / Eid",
  "Luxury Pret", "Lawn", "Abaya", "Shalwar Kameez"
]

export async function GET() {
  try {
    const sections = {}

    await Promise.all(
      CATEGORIES.map(async (cat) => {
        // Query strictly by the category column — single source of truth
        const { data, error } = await supabase
          .from('products')
          .select('id, name, brand, price, original_price, category, color, image_url, product_url, in_stock')
          .eq('category', cat)
          .eq('in_stock', true)
          .order('brand')
          .limit(50)

        if (!error && data && data.length > 0) {
          // Pick 1 product per brand up to 8, fill remaining slots if fewer brands
          const TARGET = 8
          const seen  = new Set()
          const mixed = []

          // First pass: 1 per brand (ensures brand diversity)
          for (const p of data) {
            if (!seen.has(p.brand)) {
              seen.add(p.brand)
              mixed.push(p)
              if (mixed.length === TARGET) break
            }
          }
          // Second pass: fill remaining slots
          if (mixed.length < TARGET) {
            for (const p of data) {
              if (!mixed.find(m => m.id === p.id) && mixed.length < TARGET) {
                mixed.push(p)
              }
            }
          }

          // Only add category to sections if it actually has products
          sections[cat] = mixed
        }
        // If no products found: category is simply not added to sections
        // → SharedNav and carousel will not show it
      })
    )

    // New Arrivals — most recently added products across all brands
    const { data: newData } = await supabase
      .from('products')
      .select('id, name, brand, price, original_price, category, color, image_url, product_url, in_stock')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .limit(16)

    if (newData && newData.length > 0) {
      // 1 per brand for diversity
      const seen = new Set()
      const newArrivals = []
      for (const p of newData) {
        if (!seen.has(p.brand)) {
          seen.add(p.brand)
          newArrivals.push(p)
          if (newArrivals.length === 8) break
        }
      }
      if (newArrivals.length > 0) sections['New Arrivals'] = newArrivals
    }

    return Response.json({ sections }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
