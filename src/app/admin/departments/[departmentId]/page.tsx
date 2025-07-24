"use client";

import { useParams } from "next/navigation";
import DepartmentPage from "../local_components/DepartmentPage";

export default function DepartmentEditPage() {
	const params = useParams();
	const departmentId = params.departmentId as string;

	return <DepartmentPage departmentId={departmentId} />;
}
