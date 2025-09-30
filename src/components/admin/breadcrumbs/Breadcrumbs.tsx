// src/components/admin/ui/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRoutesMeta } from "@/lib/adminRoutesMeta";
import Loading from "@/components/ui/loading/Loading";
import "./styles.scss";

export default function Breadcrumbs() {
	const pathname = usePathname();
	const segments = pathname.split("/").filter(Boolean);

	const staticMap: Record<string, string> = Object.fromEntries(Object.entries(adminRoutesMeta).map(([key, value]) => [key, value.label]));

	const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLabels = async () => {
			const ids = segments.filter((seg) => /^\d+$/.test(seg));
			if (!ids.length) {
				setLoading(false);
				return;
			}

			try {
				// Используем GET запрос с параметрами в URL, БЕЗ тела запроса
				const params = new URLSearchParams({
					ids: JSON.stringify(ids),
					segments: JSON.stringify(segments),
				});

				const res = await fetch(`/api/breadcrumbs/resolve?${params.toString()}`, {
					method: "GET",
					// Убираем headers и body - они не нужны для GET запроса
				});
				const data = await res.json();
				setDynamicLabels(data.labels || {});
			} catch (err) {
				console.error("Ошибка при загрузке заголовков крошек", err);
			} finally {
				setLoading(false);
			}
		};

		fetchLabels();
	}, [pathname]);

	if (!segments.includes("admin")) return null;

	// Специальная логика для страниц управления товарами
	const isProductManagementPage = segments.includes("product-management") && segments.includes("products");
	const isImportOrLogsPage = segments.includes("import") || segments.includes("logs");

	const breadcrumbs = segments
		.map((segment, idx) => {
			const href = "/" + segments.slice(0, idx + 1).join("/");

			// Для страниц импорта и логов товаров пропускаем уровень "products"
			if (isProductManagementPage && isImportOrLogsPage && segment === "products") {
				return null;
			}

			const label = staticMap[segment] || dynamicLabels[segment] || null;
			return label ? { href, label } : null;
		})
		.filter(Boolean);

	return (
		<div className="breadcrumbs">
			<div className="screenContent">
				{loading ? (
					<Loading />
				) : (
					<ol className="breadcrumbsList">
						<li>
							<Link href="/admin">Админ-панель</Link>
						</li>
						{breadcrumbs.slice(1).map((crumb, i) => (
							<li key={crumb!.href}>
								<div className="arrowsRight">
									<div className="arrow" />
									<div className="arrow" />
								</div>
								<Link href={crumb!.href}>{crumb!.label}</Link>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}
