import Link from "next/link";
import UserComponent from "../local_components/UserComponent";

type PageParams = {
	params: Promise<{
		userId: string;
	}>;
};

export default async function UserDetailPage({ params }: PageParams) {
	const { userId } = await params;

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<div className={`tabButton active`}>Управление пользователем</div>
					<Link href={`/admin/users/${userId}/logs`} className={`tabButton`}>
						История изменений пользователя
					</Link>
				</div>
				<UserComponent userId={userId} />
			</div>
		</div>
	);
}
