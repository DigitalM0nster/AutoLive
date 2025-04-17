"use client";

import { Dispatch, SetStateAction } from "react";

type Props = {
	formName: string;
	setFormName: Dispatch<SetStateAction<string>>;
};

export default function DepartmentTitleSettings({ formName, setFormName }: Props) {
	return (
		<input
			value={formName}
			onChange={(e) => setFormName(e.target.value)}
			className="text-3xl font-bold text-gray-800 border border-gray-300 rounded-lg px-4 py-2 w-full max-w-md mb-6"
		/>
	);
}
