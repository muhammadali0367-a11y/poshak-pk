import { supabase } from '../supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .rpc('get_distinct_brands')

    if (error) throw error

    const brands = data.map(row => row.brand).filter(Boolean).sort()
    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
