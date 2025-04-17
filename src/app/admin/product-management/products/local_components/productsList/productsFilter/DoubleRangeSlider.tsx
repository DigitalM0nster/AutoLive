"use client";
import React from "react";

type Props = {
	min: number;
	max: number;
	step?: number;
	values: [number, number];
	onChange: (val: [number, number]) => void;
};

export default function DoubleRangeSlider({ min, max, step = 1, values, onChange }: Props) {
	const percent = (val: number) => ((val - min) / (max - min)) * 100;

	const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMin = Math.min(Number(e.target.value), values[1]);
		onChange([newMin, values[1]]);
	};

	const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newMax = Math.max(Number(e.target.value), values[0]);
		onChange([values[0], newMax]);
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Ползунок */}
			<div className="relative h-4">
				{/* Трек */}
				<div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-300 rounded" />
				{/* Активная область */}
				<div
					className="absolute top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded"
					style={{
						left: `${percent(values[0])}%`,
						width: `${percent(values[1]) - percent(values[0])}%`,
					}}
				/>

				{/* Бегунки */}
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={values[0]}
					onChange={handleMinChange}
					className="absolute w-full appearance-none bg-transparent pointer-events-none z-10
						[&::-webkit-slider-thumb]:appearance-none
						[&::-webkit-slider-thumb]:h-4
						[&::-webkit-slider-thumb]:w-4
						[&::-webkit-slider-thumb]:rounded-full
						[&::-webkit-slider-thumb]:bg-blue-500
						[&::-webkit-slider-thumb]:pointer-events-auto
						[&::-webkit-slider-thumb]:cursor-pointer
					"
				/>
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={values[1]}
					onChange={handleMaxChange}
					className="absolute w-full appearance-none bg-transparent pointer-events-none z-20
						[&::-webkit-slider-thumb]:appearance-none
						[&::-webkit-slider-thumb]:h-4
						[&::-webkit-slider-thumb]:w-4
						[&::-webkit-slider-thumb]:rounded-full
						[&::-webkit-slider-thumb]:bg-blue-500
						[&::-webkit-slider-thumb]:pointer-events-auto
						[&::-webkit-slider-thumb]:cursor-pointer
					"
				/>
			</div>

			{/* Поля ввода */}
			<div className="flex justify-between gap-3">
				<input
					type="number"
					value={values[0]}
					min={min}
					max={values[1]}
					onChange={handleMinChange}
					className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
					placeholder="От"
				/>
				<input
					type="number"
					value={values[1]}
					min={values[0]}
					max={max}
					onChange={handleMaxChange}
					className="w-1/2 border border-gray-300 rounded px-2 py-1 text-sm"
					placeholder="До"
				/>
			</div>
		</div>
	);
}
