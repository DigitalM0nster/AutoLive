import { redirect } from "next/navigation";

/** Промежуточный хаб убран — все разделы на дашборде */
export default function ProductManagementHubPage() {
	redirect("/admin/dashboard");
}
