import { redirect } from "next/navigation";

export default function CategoryPage({ params }) {
  const slug = params.slug || "";

  // convert slug to readable query
  const query = slug.replace(/-/g, " ");

  redirect(`/search?q=${encodeURIComponent(query)}`);
}
