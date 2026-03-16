import { supabase } from '../../supabaseClient'

export async function GET(request, { params }) {
  try {
    const id = params?.id
    if (!id) return Response.json({ error: "No id" }, { status: 400 })

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return Response.json({ product: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
