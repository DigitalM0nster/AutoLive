"use client";

import { useState, useEffect, useRef } from "react";

type PriceRangeFilterProps = {
	label: string;
	minValue: number;
	maxValue: number;
	value: { min: number; max: number };
	onChange: (value: { min: number; max: number }) => void;
	onChangeComplete?: (value: { min: number; max: number }) => void;
	step?: number;
	disabled?: boolean;
};

export default function PriceRangeFilter({ label, minValue, maxValue, value, onChange, onChangeComplete, step = 1, disabled = false }: PriceRangeFilterProps) {
	const [isDragging, setIsDragging] = useState<"min" | "max" | null>(null);
	const sliderRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = (type: "min" | "max") => (e: React.MouseEvent) => {
		if (disabled) return;
		e.preventDefault();
		setIsDragging(type);
	};

	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging || !sliderRef.current) return;

		const rect = sliderRef.current.getBoundingClientRect();
		const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const newValue = Math.round(minValue + percentage * (maxValue - minValue));
		const steppedValue = Math.round(newValue / step) * step;

		if (isDragging === "min") {
			const newMin = Math.min(steppedValue, value.max);
			onChange({ min: newMin, max: value.max });
		} else {
			const newMax = Math.max(steppedValue, value.min);
			onChange({ min: value.min, max: newMax });
		}
	};

	const handleMouseUp = () => {
		setIsDragging(null);
		// Вызываем onChangeComplete только после окончания перетаскивания
		if (onChangeComplete) {
			onChangeComplete(value);
		}
	};

	useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, value, minValue, maxValue, step]);

	const minPercentage = ((value.min - minValue) / (maxValue - minValue)) * 100;
	const maxPercentage = ((value.max - minValue) / (maxValue - minValue)) * 100;

	const handleInputChange = (type: "min" | "max", inputValue: string) => {
		const numValue = parseFloat(inputValue);
		if (isNaN(numValue)) return;

		const clampedValue = Math.max(minValue, Math.min(maxValue, numValue));
		const steppedValue = Math.round(clampedValue / step) * step;

		if (type === "min") {
			onChange({ min: steppedValue, max: Math.max(steppedValue, value.max) });
		} else {
			onChange({ min: Math.min(steppedValue, value.min), max: steppedValue });
		}
	};

	const handleInputBlur = () => {
		// Вызываем onChangeComplete при потере фокуса с input полей
		if (onChangeComplete) {
			onChangeComplete(value);
		}
	};

	return (
		<div className="priceRangeFilter">
			<label className="priceRangeLabel">{label}</label>
			<div className="priceRangeContainer">
				<div className="priceRangeInputs">
					<input
						type="number"
						value={value.min}
						onChange={(e) => handleInputChange("min", e.target.value)}
						onBlur={handleInputBlur}
						min={minValue}
						max={maxValue}
						step={step}
						disabled={disabled}
						className="priceRangeInput"
						placeholder="От"
					/>
					<span className="priceRangeSeparator">—</span>
					<input
						type="number"
						value={value.max}
						onChange={(e) => handleInputChange("max", e.target.value)}
						onBlur={handleInputBlur}
						min={minValue}
						max={maxValue}
						step={step}
						disabled={disabled}
						className="priceRangeInput"
						placeholder="До"
					/>
				</div>
				<div className="priceRangeSlider" ref={sliderRef}>
					<div className="priceRangeTrack" />
					<div
						className="priceRangeRange"
						style={{
							left: `${minPercentage}%`,
							width: `${maxPercentage - minPercentage}%`,
						}}
					/>
					<div className={`priceRangeThumb ${isDragging === "min" ? "active" : ""}`} style={{ left: `${minPercentage}%` }} onMouseDown={handleMouseDown("min")} />
					<div className={`priceRangeThumb ${isDragging === "max" ? "active" : ""}`} style={{ left: `${maxPercentage}%` }} onMouseDown={handleMouseDown("max")} />
				</div>
			</div>
		</div>
	);
}
