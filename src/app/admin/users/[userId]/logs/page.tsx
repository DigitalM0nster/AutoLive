import Link from "next/link";
import UserLogsComponent from "@/app/admin/users/local_components/userLogs/UserLogsComponent";

type PageParams = {
	params: Promise<{
		userId: string;
	}>;
};

export default async function UserDetailLogsPage({ params }: PageParams) {
	const { userId } = await params;

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
