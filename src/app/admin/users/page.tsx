// src\app\admin\users\page.tsx
import AllUsersTable from "./local_components/allUsers/AllUsersTable";
import styles from "./local_components/styles.module.scss";
import Link from "next/link";

const UsersPage = () => {
	return (
		<div className={`screenContent ${styles.screenContent}`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<div className={`tabButton active`}>Список пользователей</div>
					<Link href="/admin/users/logs" className={`tabButton`}>
						История изменений
					</Link>
				</div>

				<AllUsersTable />
			</div>
		</div>
	);
};

export default UsersPage;
