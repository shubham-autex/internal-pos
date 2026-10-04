import { redirect } from "next/navigation";

/** Product details open as a popup on the sell page — never a standalone page. */
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/?info=${encodeURIComponent(id)}`);
}
