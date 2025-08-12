"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import UserComponent from "../local_components/UserComponent";

export default function UserDetailPage() {
	const params = useParams();
	const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<div className={`tabButton active`}>Управление пользователем</div>
					<Link href={`/admin/users/${userId}/logs`} className={`tabButton`}>
						История изменений пользователя
					</Link>
				</div>
				<UserComponent userId={userId} />;
			</div>
		</div>
	);
}
