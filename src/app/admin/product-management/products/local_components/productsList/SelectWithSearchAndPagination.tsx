// src\app\admin\product-management\products\local_components\productsList\SelectWithSearchAndPagination.tsx

"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";

export type Option = {
	id: string;
	title: string;
	productCount?: number;
};

type Props = {
	options: Option[];
	value: string;
	onChange: (val: string) => void;
	placeholder?: string;
};

export default function SelectWithSearchAndPagination({ options, value, onChange, placeholder }: Props) {
	const [searchTerm, setSearchTerm] = useState("");
	const [showDropdown, setShowDropdown] = useState(false);
	const [itemsToShow, setItemsToShow] = useState(10);

	// Создаем ref для отслеживания кликов вне компонента
	const containerRef = useRef<HTMLDivElement>(null);

	const filtered = useMemo(() => {
		return options.filter((opt) => opt.title.toLowerCase().includes(searchTerm.toLowerCase()));
	}, [options, searchTerm]);

	const displayOptions = filtered.slice(0, itemsToShow);
	const selectedOption = options.find((opt) => opt.id === value);

	useEffect(() => {
		setItemsToShow(10);
	}, [searchTerm]);

	const loadMore = () => {
		setItemsToShow((prev) => prev + 10);
	};

	// Обработчик кликов вне компонента
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	return (
		<div className="relative" ref={containerRef}>
			<button type="button" className="w-full border border-black/10 p-2 rounded text-left" onClick={() => setShowDropdown(!showDropdown)}>
				{selectedOption?.title || placeholder || "Выбрать"}
			</button>

			{showDropdown && (
				<div className="absolute z-10 bg-white w-full mt-1 rounded shadow max-h-64 overflow-y-auto">
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
						{placeholder ? `${placeholder}` : "Все"}
					</button>

					{displayOptions.map((opt) => {
						const titleParts = searchTerm ? opt.title.split(new RegExp(`(${searchTerm})`, "gi")) : [opt.title];

						return (
							<button
								key={opt.id}
								onClick={() => {
									onChange(opt.id);
									setShowDropdown(false);
									setSearchTerm("");
								}}
								className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
							>
								<span>
									{titleParts.map((part, idx) =>
										part.toLowerCase() === searchTerm.toLowerCase() ? (
											<span key={idx} className="font-bold">
												{part}
											</span>
										) : (
											<span key={idx}>{part}</span>
										)
									)}
								</span>
								{opt.productCount !== undefined && <span className="text-gray-400 ml-1">({opt.productCount})</span>}
							</button>
						);
					})}

					{displayOptions.length < filtered.length && (
						<button onClick={loadMore} className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100">
							Ещё
						</button>
					)}

					{filtered.length === 0 && <div className="px-2 py-1 text-sm text-gray-400">Ничего не найдено</div>}
				</div>
			)}
		</div>
	);
}
