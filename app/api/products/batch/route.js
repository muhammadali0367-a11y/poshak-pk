import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean)

    if (ids.length === 0) return Response.json({ products: [] })

    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, price, original_price, product_type, tags, collection, color, fabric, occasion, image_url, product_url, in_stock')
      .in('id', ids)

    if (error) throw error

    return Response.json({ products: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
