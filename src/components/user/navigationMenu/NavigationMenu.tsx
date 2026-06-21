"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getPreviousSitePath, trackSitePath } from "@/lib/siteNavigationHistory";
import styles from "./styles.module.scss";
import { Product, Category } from "@/lib/types";

type BreadcrumbItem = {
	name: string;
	path: string;
};

type NavigationMenuProps = {
	productId?: string | number;
};

/** Страницы, которые не показываем в горизонтальной навигации разделов (только в подвале / отдельных URL) */
const SECTION_NAV_EXCLUDED = new Set(["/catalog", "/privacy", "/cookies"]);

export default function NavigationMenu({ productId }: NavigationMenuProps) {
	const pathname = usePathname();
	const router = useRouter();

	const [categories, setCategories] = useState<Category[]>([]);
	const [product, setProduct] = useState<Product | null>(null);

	const pages = useMemo<Record<string, string>>(
		() => ({
			"/categories": "Материалы для ТО",
			"/service-kits": "Комплекты ТО",
			"/booking": "Запись на ТО",
			"/products": "Запчасти",
			"/catalog": "Запчасти",
			"/contacts": "Контакты",
			"/promotions": "Акции",
			"/privacy": "Политика персональных данных",
			"/cookies": "Политика cookie",
		}),
		[],
	);

	useEffect(() => {
		fetch("/api/categories")
			.then((res) => res.json())
			.then((data) => {
				setCategories(Array.isArray(data) ? data : []);
			})
			.catch(() => {
				setCategories([]);
			});
	}, []);

	useEffect(() => {
		if (productId) {
			fetch(`/api/products/${productId}/public`)
				.then((res) => res.json())
				.then((data) => setProduct(data.product))
				.catch(() => setProduct(null));
		}
	}, [productId]);

	const getCategoryTitle = useCallback(
		(id: string | number): string | undefined => {
			if (!Array.isArray(categories)) return undefined;
			return categories.find((cat) => cat.id.toString() === id.toString())?.title;
		},
		[categories],
	);

	const breadcrumbs = useMemo((): BreadcrumbItem[] => {
		const segments = pathname.split("/").filter(Boolean);

		if (segments[0] === "promotions" && segments.length === 2) {
			const slug = segments[1];
			const titleFromSlug = decodeURIComponent(slug).replace(/-/g, " ");

			return [
				{ name: "Акции", path: "/promotions" },
				{ name: titleFromSlug, path: `/promotions/${slug}` },
			];
		}

		if (segments[0] === "cart") {
			return [{ name: "Корзина", path: "/cart" }];
		}

		if (segments[0] === "profile") {
			const profileLabels: Record<string, string> = {
				orders: "Заказы",
				bookings: "Записи на ТО",
				settings: "Настройки",
			};

			return segments.map((segment, index) => {
				const fullPath = "/" + segments.slice(0, index + 1).join("/");
				let name = "Профиль";

				if (index > 0) {
					if (/^\d+$/.test(segment)) {
						const parent = segments[index - 1];
						name = parent === "orders" ? `Заказ №${segment}` : parent === "bookings" ? `Запись №${segment}` : `№${segment}`;
					} else {
						name = profileLabels[segment] ?? decodeURIComponent(segment);
					}
				}

				return { name, path: fullPath };
			});
		}

		if (segments[0] === "products" && segments.length === 2) {
			const id = segments[1];

			if (/^\d+$/.test(id) && !product) {
				return [{ name: "Загрузка…", path: `/products/${id}` }];
			}

			if (/^\d+$/.test(id) && product?.title) {
				const trail: BreadcrumbItem[] = [];

				if (product.categoryId) {
					trail.push({ name: "Материалы для ТО", path: "/categories" });
					const categoryTitle = getCategoryTitle(product.categoryId);
					if (categoryTitle) {
						trail.push({ name: categoryTitle, path: `/categories/${product.categoryId}` });
					}
				} else {
					trail.push({ name: "Запчасти", path: "/products" });
				}

				trail.push({ name: product.title, path: `/products/${id}` });
				return trail;
			}

			return [];
		}

		if (segments[0] === "categories" && segments.length === 2) {
			const categoryId = segments[1];

			if (/^\d+$/.test(categoryId)) {
				const categoryTitle = getCategoryTitle(categoryId);

				return [
					{ name: "Материалы для ТО", path: "/categories" },
					{
						name: categoryTitle ?? "Загрузка…",
						path: `/categories/${categoryId}`,
					},
				];
			}

			return [];
		}

		return segments
			.map((segment, index) => {
				const fullPath = "/" + segments.slice(0, index + 1).join("/");
				let name: string = pages[fullPath] ?? decodeURIComponent(segment);

				if (segments[0] === "categories" && index === 1 && segments.length > 2 && /^\d+$/.test(segment)) {
					const categoryTitle = getCategoryTitle(segment);
					if (!categoryTitle) return null;
					name = categoryTitle;
				}

				if (segments[0] === "products" && index === 1 && segments.length > 2 && /^\d+$/.test(segment)) {
					if (!product?.title) return null;
					name = product.title;
				}

				return { name, path: fullPath };
			})
			.filter((item): item is BreadcrumbItem => item !== null && Boolean(item.name));
	}, [pathname, categories, product, getCategoryTitle, pages]);

	const trailItems = useMemo((): { label: string; href?: string }[] => {
		const items: { label: string; href?: string }[] = [{ label: "Главная", href: "/" }];

		breadcrumbs.forEach((crumb, index) => {
			const isLast = index === breadcrumbs.length - 1;
			items.push(isLast ? { label: crumb.name } : { label: crumb.name, href: crumb.path });
		});

		return items;
	}, [breadcrumbs]);

	const isProfileSection = pathname === "/profile" || pathname.startsWith("/profile/");
	const isLegalPage = pathname === "/privacy" || pathname === "/cookies";

	useEffect(() => {
		trackSitePath(pathname);
	}, [pathname]);

	const getFallbackBackPath = useCallback((): string => {
		if (breadcrumbs.length > 1) {
			return breadcrumbs[breadcrumbs.length - 2].path;
		}
		return "/";
	}, [breadcrumbs]);

	const handleBack = useCallback(() => {
		const previous = getPreviousSitePath(pathname);
		router.push(previous ?? getFallbackBackPath());
	}, [getFallbackBackPath, pathname, router]);

	return (
		<div className={styles.navigationMenu}>
			<nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
				<span
					role="button"
					tabIndex={0}
					className={styles.backLink}
					onClick={handleBack}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							handleBack();
						}
					}}
				>
					<span className={styles.backChevron} aria-hidden="true" />
					Назад
				</span>

				<ol className={styles.breadcrumbList}>
					{trailItems.map((item, index) => {
						const isLast = index === trailItems.length - 1;

						return (
							<li key={`${item.label}-${index}`} className={styles.breadcrumbItem}>
								{isLast || !item.href ? (
									<span className={styles.breadcrumbCurrent} aria-current={isLast ? "page" : undefined}>
										{item.label}
									</span>
								) : (
									<Link href={item.href} className={styles.breadcrumbLink}>
										{item.label}
									</Link>
								)}
							</li>
						);
					})}
				</ol>
			</nav>

			{!isProfileSection && !isLegalPage && (
				<div className={styles.sectionNav}>
					{Object.entries(pages)
						.filter(([path]) => !SECTION_NAV_EXCLUDED.has(path))
						.map(([path, name]) => {
							let isActive = pathname.startsWith(path);

							if (pathname.startsWith("/products/") && product?.categoryId && path === "/categories") {
								isActive = true;
							} else if (pathname.startsWith("/products/") && product?.categoryId && path === "/products") {
								isActive = false;
							}

							return (
								<Link key={path} href={path} className={[styles.sectionLink, isActive ? styles.sectionLinkActive : ""].filter(Boolean).join(" ")}>
									{name}
								</Link>
							);
						})}
				</div>
			)}
		</div>
	);
}
