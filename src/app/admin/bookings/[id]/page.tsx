import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import BookingFormComponent from "../local_components/booking/BookingFormComponent";

type PageParams = {
	params: Promise<{
		id: string;
	}>;
};

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function BookingDetailPage({ params }: PageParams) {
	const { id } = await params;
	const bookingId = parseInt(id);

	// Проверяем, что ID корректный
	if (isNaN(bookingId)) {
		redirect("/admin/bookings");
	}

	const cookieStore = await cookies();
	const token = cookieStore.get("authToken")?.value;

	// Проверяем авторизацию
	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken | null = null;

	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch (e) {
		redirect("/admin");
	}

	// Проверяем права доступа - только admin, superadmin и manager могут просматривать записи
	if (!["superadmin", "admin", "manager"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href={`/admin/bookings/${bookingId}`} className="tabButton active">
						{user.role === "manager" ? "Просмотр записи" : "Управление записью"}
					</Link>
					<Link href={`/admin/bookings/${bookingId}/logs`} className="tabButton">
						История изменений записи
					</Link>
				</div>
				<div className="tableContent bookingComponent">
					<BookingFormComponent isCreating={false} bookingId={bookingId} userRole={user.role} />
				</div>
			</div>
		</div>
	);
}
