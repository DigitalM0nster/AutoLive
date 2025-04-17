"use client";

import { Users } from "lucide-react";

export default function DepartmentStaffSection({ users }: { users?: { id: number; first_name: string; last_name: string; phone: string; role: string }[] }) {
	if (!users || users.length === 0) {
		return (
			<div className="mb-10">
				<h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
					<Users className="w-5 h-5 text-indigo-600" />
					Сотрудники отдела
				</h2>
				<p className="text-gray-500">Нет сотрудников</p>
			</div>
		);
	}

	const admins = users.filter((u) => u.role === "admin");
	const managers = users.filter((u) => u.role === "manager");

	return (
		<div className="mb-10">
			<h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
				<Users className="w-5 h-5 text-indigo-600" />
				Сотрудники отдела
			</h2>

			{admins.length > 0 && (
				<div className="mb-4">
					<h3 className="text-sm font-medium text-gray-600 mb-2">Администраторы</h3>
					<ul className="space-y-2">
						{admins.map((admin) => (
							<li key={admin.id} className="bg-gray-100 px-4 py-2 rounded-lg">
								{admin.first_name} {admin.last_name}
								<span className="text-gray-500 ml-2">({admin.phone})</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{managers.length > 0 && (
				<div>
					<h3 className="text-sm font-medium text-gray-600 mb-2">Менеджеры</h3>
					<ul className="space-y-2">
						{managers.map((manager) => (
							<li key={manager.id} className="bg-gray-100 px-4 py-2 rounded-lg">
								{manager.first_name} {manager.last_name}
								<span className="text-gray-500 ml-2">({manager.phone})</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
