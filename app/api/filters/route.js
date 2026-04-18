import { supabase } from '@/app/lib/supabase'

// Non-string columns must not use .neq(column, '')
const NON_STRING_COLUMNS = new Set(['piece_count', 'in_stock'])

// Paginate through in-stock rows only to get truly distinct values
async function getDistinctValues(column) {
  const seen = new Set()
  let from = 0
  const PAGE = 1000

  while (true) {
    let query = supabase
      .from('products')
      .select(column)
      .not(column, 'is', null)
      .eq('in_stock', true)

    if (!NON_STRING_COLUMNS.has(column)) {
      query = query.neq(column, '')
    }

    const { data, error } = await query.range(from, from + PAGE - 1)

    if (error || !data || data.length === 0) break

    data.forEach(r => {
      const v = r[column]
      if (v === null || v === undefined) return
      const stored = typeof v === 'string' ? v.trim() : v
      if (stored !== '') seen.add(stored)
    })

    if (data.length < PAGE) break
    from += PAGE
  }

  return [...seen].sort()
}

export async function GET() {
  try {
    const [
      main_categories,
      stitch_types,
      tiers,
      colors,
      fabrics,
      occasions,
      piece_counts,
    ] = await Promise.all([
      getDistinctValues('main_category'),
      getDistinctValues('stitch_type'),
      getDistinctValues('tier'),
      getDistinctValues('color'),
      getDistinctValues('fabric'),
      getDistinctValues('occasion'),
      getDistinctValues('piece_count'),
    ])

    const cleanPieceCounts = (piece_counts || [])
      .map(v => Number(v))
      .filter(v => !isNaN(v) && v > 0)
      .sort((a, b) => a - b)

    return Response.json({
      main_category: main_categories,
      stitch_type:   stitch_types,
      tier:          tiers,
      color:         colors,
      fabric:        fabrics,
      occasion:      occasions,
      piece_count:   cleanPieceCounts,
      in_stock:      [true, false],
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
