// src/app/(site)/products/page.tsx

import styles from "./styles.module.scss";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import ProductsPageClient from "./ProductsPageClient";

export default function ProductsPage() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<h1 className={`pageTitle ${styles.pageTitle}`}>Запчасти</h1>
				<ProductsPageClient />
			</div>
		</div>
	);
}
