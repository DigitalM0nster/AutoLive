import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import BookingFormComponent from "../local_components/booking/BookingFormComponent";

type DecodedToken = {
	id: number;
	role: string;
	phone: string;
	iat: number;
	exp: number;
};

export default async function CreateBookingPage() {
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

	// Проверяем права доступа - только админы и суперадмины могут создавать записи
	if (!["superadmin", "admin"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className={`screenContent`}>
			<div className={`tableContainer`}>
				<div className={`tabsContainer`}>
					<div className={`tabButton active`}>Создание записи</div>
				</div>
				<div className={`tableContent bookingComponent`}>
					<BookingFormComponent isCreating={true} userRole={user.role} />
				</div>
			</div>
		</div>
	);
}
