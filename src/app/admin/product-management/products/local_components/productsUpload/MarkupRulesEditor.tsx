// src\app\admin\product-management\products\local_components\productsUpload\MarkupRulesEditor.tsx

"use client";

import { useEffect } from "react";

export type MarkupRule = {
	from: number | null;
	to: number | null;
	type: "%" | "₽";
	value: number | null;
};

export type DefaultMarkup = {
	type: "%" | "₽";
	value: number;
};

type Props = {
	rules: MarkupRule[];
	setRules: (rules: MarkupRule[]) => void;
	defaultMarkup: DefaultMarkup;
	setDefaultMarkup: (markup: DefaultMarkup) => void;
	onValidationChange?: (hasError: boolean) => void;
};

export default function MarkupRulesEditor({ rules, setRules, defaultMarkup, setDefaultMarkup, onValidationChange }: Props) {
	const handleChange = (index: number, field: keyof MarkupRule, value: string) => {
		const updated = [...rules];
		if (field === "type") {
			updated[index][field] = value as "%" | "₽";
		} else {
			updated[index][field] = value === "" ? null : Number(value);
		}
		setRules(updated);
	};

	const handleRemove = (index: number) => {
		setRules(rules.filter((_, i) => i !== index));
	};

	const handleAdd = () => {
		setRules([...rules, { from: null, to: null, type: "%", value: null }]);
	};

	const formatValue = (val: number | null) => (val === null ? "" : val);

	const getFieldErrors = (rule: MarkupRule) => {
		const errors: Partial<Record<keyof MarkupRule, string>> = {};

		if (rule.value === null || isNaN(rule.value)) {
			errors.value = "Не задана наценка";
		}
		if (rule.from !== null && rule.to !== null && rule.from > rule.to) {
			errors.from = "«От» больше чем «До»";
			errors.to = "«До» меньше чем «От»";
		}

		return errors;
	};

	useEffect(() => {
		const hasError = rules.some((r) => Object.keys(getFieldErrors(r)).length > 0);
		onValidationChange?.(hasError);
	}, [rules]);

	return (
		<>
			<h3 className="font-semibold mb-1 mt-6">Установление наценки:</h3>
			<div className="border border-black/10 p-4 rounded">
				<div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-sm font-medium text-gray-600 mb-1">
					<span>От (₽)</span>
					<span>До (₽)</span>
					<span>Тип</span>
					<span>Значение</span>
					<span></span>
				</div>

				<div className="space-y-2 mb-4">
					{rules.map((rule, index) => {
						const errors = getFieldErrors(rule);
						const getInputClass = (field: keyof MarkupRule) => `border px-2 py-1 rounded text-sm ${errors[field] ? "border-red-500 bg-red-50 text-red-600" : ""}`;

						return (
							<div key={index} className="grid grid-cols-5 gap-2 items-start">
								{/* from */}
								<div className="flex flex-col">
									<input
										type="number"
										value={formatValue(rule.from)}
										onChange={(e) => handleChange(index, "from", e.target.value)}
										className={getInputClass("from")}
										placeholder="не задано"
									/>
									{errors.from && <span className="text-xs text-red-600 mt-1">{errors.from}</span>}
								</div>

								{/* to */}
								<div className="flex flex-col">
									<input
										type="number"
										value={formatValue(rule.to)}
										onChange={(e) => handleChange(index, "to", e.target.value)}
										className={getInputClass("to")}
										placeholder="не задано"
									/>
									{errors.to && <span className="text-xs text-red-600 mt-1">{errors.to}</span>}
								</div>

								{/* type */}
								<div className="flex flex-col">
									<select value={rule.type} onChange={(e) => handleChange(index, "type", e.target.value)} className="border px-2 py-1 rounded text-sm">
										<option value="%">%</option>
										<option value="₽">₽</option>
									</select>
								</div>

								{/* value */}
								<div className="flex flex-col">
									<input
										type="number"
										value={formatValue(rule.value)}
										onChange={(e) => handleChange(index, "value", e.target.value)}
										className={getInputClass("value")}
										placeholder="наценка"
									/>
									{errors.value && <span className="text-xs text-red-600 mt-1">{errors.value}</span>}
								</div>

								{/* delete */}
								<div className="flex items-center h-full pt-1">
									<button onClick={() => handleRemove(index)} className="text-red-500 text-xs hover:underline">
										Удалить
									</button>
								</div>
							</div>
						);
					})}
				</div>

				<button onClick={handleAdd} className="text-blue-600 text-sm hover:underline mb-4">
					+ Добавить правило
				</button>

				<div className="pt-4 border-t border-black/10 mt-4">
					<label className="font-medium text-sm mr-2">Стандартная наценка:</label>
					<select
						value={defaultMarkup.type}
						onChange={(e) => setDefaultMarkup({ ...defaultMarkup, type: e.target.value as "%" | "₽" })}
						className="border p-1 rounded mr-2 text-sm"
					>
						<option value="%">%</option>
						<option value="₽">₽</option>
					</select>
					<input
						type="number"
						value={defaultMarkup.value}
						onChange={(e) => setDefaultMarkup({ ...defaultMarkup, value: Number(e.target.value) })}
						className="border p-1 rounded w-24 text-sm"
					/>
				</div>
			</div>
		</>
	);
}
