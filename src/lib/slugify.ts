/**
 * Преобразует заголовок в URL-slug (например "Spring Sale!" → "spring-sale").
 * Используется для страниц акций /promotions/[slug].
 */
export function slugify(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9а-яё\-]/gi, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}
