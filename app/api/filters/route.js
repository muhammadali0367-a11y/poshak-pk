import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paginate through all rows to get truly distinct values
async function getDistinctValues(column) {
  const seen = new Set()
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select(column)
      .not(column, 'is', null)
      .neq(column, '')
      .range(from, from + PAGE - 1)

    if (error || !data || data.length === 0) break
    data.forEach(r => { if (r[column]) seen.add(r[column]) })
    if (data.length < PAGE) break
    from += PAGE
  }

  return [...seen].sort()
}

export async function GET() {
  try {
    const [colors, fabrics, occasions] = await Promise.all([
      getDistinctValues('color'),
      getDistinctValues('fabric'),
      getDistinctValues('occasion'),
    ])

    return Response.json({ colors, fabrics, occasions })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
