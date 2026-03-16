import { supabase } from '../supabaseClient'

export async function GET() {
  try {
    // Fetch all brand names in batches and deduplicate
    let allBrands = new Set()
    let from = 0
    const batchSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('brand')
        .range(from, from + batchSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      data.forEach(r => { if (r.brand) allBrands.add(r.brand) })

      if (data.length < batchSize) break
      from += batchSize
    }

    const brands = [...allBrands].filter(Boolean).sort()
    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
