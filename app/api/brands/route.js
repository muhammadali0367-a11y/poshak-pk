import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    // Single query with high limit — gets all brand names at once
    // Supabase has no DISTINCT in JS client so we fetch brand column only and dedupe in JS
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand')
      .limit(100000)

    if (error) throw error

    const brands = [...new Set((data || []).map(r => r.brand).filter(Boolean))].sort()
    return Response.json({ brands })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
