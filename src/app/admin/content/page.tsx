import { redirect } from "next/navigation";

/** Промежуточный хаб убран — все разделы на дашборде */
export default function AdminContentHubPage() {
	redirect("/admin/dashboard");
}
