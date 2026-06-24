/**
 * Путь к картинке акции для отображения на сайте.
 * Seed указывал /images/promotions/*.png — этих файлов нет в public на Vercel.
 */
export function resolvePromotionImageSrc(image: string | null | undefined): string | null {
	if (!image?.trim()) return null;

	const src = image.trim();

	// Устаревшие seed-пути — файлов в репозитории нет
	if (src.startsWith("/images/promotions/")) {
		return null;
	}

	return src;
}
