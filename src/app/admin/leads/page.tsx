import { redirect } from "next/navigation";

/** Раздел заявок с главной — /admin/homepage-requests */
export default function AdminLeadsRedirectPage() {
	redirect("/admin/homepage-requests");
}
