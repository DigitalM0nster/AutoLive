"use client";

import { useParams } from "next/navigation";
import UserPage from "../local_components/UserPage";

export default function UserDetailPage() {
	const params = useParams();
	const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

	return <UserPage userId={userId} />;
}
