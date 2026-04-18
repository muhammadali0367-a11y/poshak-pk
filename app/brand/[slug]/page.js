import { redirect } from "next/navigation";

export default function BrandPage({ params }) {
  const slug = params.slug || "";
  const brand = slug.replace(/-/g, " ");
  redirect(`/search?brand=${encodeURIComponent(brand)}`);
}
