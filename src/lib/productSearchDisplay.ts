import type { ProductListItem } from "@/lib/types";

export function formatProductPrice(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return "—";
	return `${value.toLocaleString("ru-RU")} ₽`;
}

export type ProductSearchListRow = Pick<
	ProductListItem,
	"id" | "sku" | "title" | "brand" | "price" | "supplierPrice" | "department" | "image"
>;

export function productDepartmentLine(row: ProductSearchListRow): string {
	return row.department?.name?.trim() || "—";
}
