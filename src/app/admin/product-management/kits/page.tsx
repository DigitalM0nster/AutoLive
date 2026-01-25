// src/app/admin/product-management/kits/page.tsx
import AllServiceKitsTable from "./local_components/allServiceKits/AllServiceKitsTable";
import styles from "../products/local_components/styles.module.scss";
import Link from "next/link";

const KitsPage = () => {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/product-management/kits/" className={`tabButton active`}>
						Список комплектов ТО
					</Link>
					<Link href="/admin/product-management/kits/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllServiceKitsTable />
			</div>
		</div>
	);
};

export default KitsPage;
