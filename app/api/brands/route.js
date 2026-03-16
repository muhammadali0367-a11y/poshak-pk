import { supabase } from '../supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .order('brand')

    if (error) throw error

    const brands = [...new Set(data.map(p => p.brand))].sort()

    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
