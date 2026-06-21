// src/app/(site)/products/page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import ProductsPageClient from "./ProductsPageClient";

export default function ProductsPage() {
	return (
		<div className="screen">
			<div className="screenContent">
				<NavigationMenu />

				<header className={styles.pageHeader}>
					<h1 className={`pageTitle ${styles.pageTitle}`}>Запчасти</h1>
					<p className={`pageLead ${styles.pageLead}`}>
						Поиск по артикулу, бренду и названию — быстрый доступ к нужной детали из общего каталога.
					</p>
				</header>

				<ProductsPageClient />
			</div>
		</div>
	);
}
