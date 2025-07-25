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
				const res = await fetch("/api/breadcrumbs/resolve", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ids, segments }),
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

	const breadcrumbs = segments
		.map((segment, idx) => {
			const href = "/" + segments.slice(0, idx + 1).join("/");
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
								<ChevronRight />
								<Link href={crumb!.href}>{crumb!.label}</Link>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}
