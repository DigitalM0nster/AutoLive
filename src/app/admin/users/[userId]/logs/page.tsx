"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import UserLogsComponent from "../../local_components/UserLogsComponent";

export default function UserDetailLogsPage() {
	const params = useParams();
	const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<Link href={`/admin/users/${userId}`} className={`tabButton`}>
						Управление пользователем
					</Link>
					<Link href={`/admin/users/${userId}/logs`} className={`tabButton active`}>
						История изменений пользователя
					</Link>
				</div>
				<UserLogsComponent userId={Number(userId)} />
			</div>
		</div>
	);
}
