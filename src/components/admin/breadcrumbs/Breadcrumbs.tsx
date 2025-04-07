// src/components/admin/ui/Breadcrumbs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRoutesMeta } from "@/lib/adminRoutesMeta";
import Loading from "@/components/ui/loading/Loading";

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
		<div className="bg-gray-50 border-b border-gray-200 w-full">
			<div className="px-6 py-2 text-sm text-gray-600 max-w-7xl mx-auto">
				{loading ? (
					<Loading />
				) : (
					<ol className="flex items-center flex-wrap gap-x-1">
						<li>
							<Link href="/admin" className="hover:underline text-blue-600">
								Админка
							</Link>
						</li>
						{breadcrumbs.slice(1).map((crumb, i) => (
							<li key={crumb!.href} className="flex items-center space-x-1">
								<ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
								<Link href={crumb!.href} className={`hover:underline ${i === breadcrumbs.length - 2 ? "text-gray-800 font-medium" : "text-blue-600"}`}>
									{crumb!.label}
								</Link>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}
