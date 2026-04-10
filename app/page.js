// SERVER COMPONENT — no "use client"
// Fetches homepage data from Supabase before the page is sent to the browser.
// The user receives HTML with products already baked in — zero client-side wait.

import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

const CATEGORIES = [
  "Pret / Ready to Wear", "Unstitched", "Kurta", "Formal",
  "Bridal", "Co-ords", "Winter Collection", "Festive / Eid",
  "Luxury Pret", "Lawn", "Abaya", "Shalwar Kameez"
]

// Tell Next.js to revalidate this page every 5 minutes
// (same TTL as the API route Cache-Control)
export const revalidate = 300

async function getHomepageSections() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const sections = {}

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, price, original_price, category, color, image_url, product_url, in_stock')
        .eq('category', cat)
        .eq('in_stock', true)
        .order('brand')
        .limit(200)

      if (!error && data && data.length > 0) {
        const TARGET = 8
        const seen = new Set()
        const mixed = []

        for (const p of data) {
          if (!seen.has(p.brand)) {
            seen.add(p.brand)
            mixed.push(p)
            if (mixed.length === TARGET) break
          }
        }
        if (mixed.length < TARGET) {
          for (const p of data) {
            if (!mixed.find(m => m.id === p.id) && mixed.length < TARGET) {
              mixed.push(p)
            }
          }
        }

        sections[cat] = mixed
      }
    })
  )

  // New Arrivals
  const { data: newData } = await supabase
    .from('products')
    .select('id, name, brand, price, original_price, category, color, image_url, product_url, in_stock')
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(16)

  if (newData && newData.length > 0) {
    const seen = new Set()
    const newArrivals = []
    for (const p of newData) {
      if (!seen.has(p.brand)) {
        seen.add(p.brand)
        newArrivals.push(p)
        if (newArrivals.length === 8) break
      }
    }
    if (newArrivals.length > 0) sections['New Arrivals'] = newArrivals
  }

  return sections
}

export default async function Page() {
  const initialSections = await getHomepageSections()

  return <HomeClient initialSections={initialSections} />
}
