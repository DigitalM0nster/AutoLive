// src/app/admin/categories/page.tsx

import AllCategoriesTable from "./local_components/AllCategoriesTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

export default function CategoriesDashboardPage() {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer ${styles.tableContainer}`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className="tabTitle">Список категорий</div>
				</div>

				<AllCategoriesTable />
			</div>
		</div>
	);
}
