// src\app\admin\product-management\products\page.tsx
import AllProductsTable from "./local_components/allProducts/AllProductsTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

const ProductsPage = () => {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/product-management/products/" className={`tabButton active`}>
						Список товаров
					</Link>
					<Link href="/admin/product-management/products/import" className={`tabButton`}>
						Импорт товаров
					</Link>
					<Link href="/admin/product-management/products/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllProductsTable />
			</div>
		</div>
	);
};

export default ProductsPage;
