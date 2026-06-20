import { redirect } from "next/navigation";

/** Алиас каталога запчастей — в проекте каталог живёт на /products */
export default function CatalogPage() {
	redirect("/products");
}
