import styles from "../local_components/styles.module.scss";
import Link from "next/link";
import AllUsersLogsComponent from "../local_components/AllUsersLogsComponent";

export default function UsersLogsPage() {
	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer ${styles.tabsContainer}`}>
					<Link href="/admin/users/" className={`tabButton`}>
						Список пользователей
					</Link>
					<div className={`tabButton active`}>История изменений</div>
				</div>

				{/* Компонент с логами всех пользователей */}
				<AllUsersLogsComponent />
			</div>
		</div>
	);
}
