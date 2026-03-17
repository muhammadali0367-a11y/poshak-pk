import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET() {
  try {
    // Fetch distinct non-empty values for all three filter columns in parallel
    const [colorRes, fabricRes, occasionRes] = await Promise.all([
      supabase.from('products').select('color').not('color','is',null).neq('color','').order('color').limit(100000),
      supabase.from('products').select('fabric').not('fabric','is',null).neq('fabric','').order('fabric').limit(100000),
      supabase.from('products').select('occasion').not('occasion','is',null).neq('occasion','').order('occasion').limit(100000),
    ])

    const colors   = [...new Set((colorRes.data   || []).map(r => r.color).filter(Boolean))].sort()
    const fabrics  = [...new Set((fabricRes.data  || []).map(r => r.fabric).filter(Boolean))].sort()
    const occasions = [...new Set((occasionRes.data || []).map(r => r.occasion).filter(Boolean))].sort()

    return Response.json({ colors, fabrics, occasions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
