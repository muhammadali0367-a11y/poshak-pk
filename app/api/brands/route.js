import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const allBrands = new Set()
    let from = 0

    // Paginate through ALL products to collect all unique brands
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null)
        .range(from, from + 999)

      if (error) throw error
      if (!data || data.length === 0) break

      data.forEach(r => { if (r.brand) allBrands.add(r.brand) })

      if (data.length < 1000) break  // Last page
      from += 1000
    }

    const brands = [...allBrands].sort()
    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
