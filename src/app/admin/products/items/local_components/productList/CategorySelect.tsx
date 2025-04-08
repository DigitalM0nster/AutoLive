"use client";

import { useState } from "react";
import { Category } from "@/lib/types";

type Props = {
	categories: Category[];
	value: string;
	onChange: (val: string) => void;
};

export default function CategorySelect({ categories, value, onChange }: Props) {
	const [searchTerm, setSearchTerm] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);

	const filtered = categories.filter((cat) => cat.title.toLowerCase().includes(searchTerm.toLowerCase()));

	const selectedCategory = categories.find((cat) => cat.id.toString() === value);

	return (
		<div className="relative">
			<button type="button" className="w-full border p-2 rounded bg-white text-left" onClick={() => setShowDropdown(!showDropdown)}>
				{selectedCategory?.title || "Все категории"}
			</button>

			{showDropdown && (
				<div className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-64 overflow-y-auto">
					<input
						type="text"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder="Поиск..."
						className="w-full border-b px-2 py-1 text-sm outline-none"
					/>

					<button
						onClick={() => {
							onChange("");
							setShowDropdown(false);
							setSearchTerm("");
						}}
						className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
					>
						Все категории
					</button>

					{filtered.map((cat) => (
						<button
							key={cat.id}
							onClick={() => {
								onChange(cat.id.toString());
								setShowDropdown(false);
								setSearchTerm("");
							}}
							className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
						>
							{cat.title}
						</button>
					))}
					{filtered.length === 0 && <div className="px-2 py-1 text-sm text-gray-400">Ничего не найдено</div>}
				</div>
			)}
		</div>
	);
}
