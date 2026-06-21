import Link from "next/link";
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

	if (!token) {
		redirect("/admin");
	}

	let user: DecodedToken | null = null;

	try {
		user = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
	} catch (e) {
		redirect("/admin");
	}

	if (!["superadmin", "admin"].includes(user.role)) {
		redirect("/admin/dashboard");
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer">
					<Link href="/admin/bookings" className="tabButton">
						Список записей
					</Link>
					<div className="tabButton active">Новая запись</div>
				</div>
				<div className="tableContent bookingComponent kitContent">
					<BookingFormComponent isCreating={true} userRole={user.role} />
				</div>
			</div>
		</div>
	);
}
