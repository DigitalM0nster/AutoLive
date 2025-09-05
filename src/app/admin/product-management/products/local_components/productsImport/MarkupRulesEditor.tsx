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
			<h3 style={{ fontWeight: "600", marginBottom: "4px", marginTop: "24px" }}>Установление наценки:</h3>
			<div className="borderBlock">
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
						gap: "8px",
						fontSize: "14px",
						fontWeight: "500",
						color: "var(--text-color)",
						opacity: "0.6",
						marginBottom: "4px",
					}}
				>
					<span>От (₽)</span>
					<span>До (₽)</span>
					<span>Тип</span>
					<span>Значение</span>
					<span></span>
				</div>

				<div className="columnList" style={{ marginBottom: "16px" }}>
					{rules.map((rule, index) => {
						const errors = getFieldErrors(rule);
						const getInputStyle = (field: keyof MarkupRule) => ({
							borderColor: errors[field] ? "var(--red-color)" : "var(--grey-color)",
							backgroundColor: errors[field] ? "rgba(239, 68, 68, 0.1)" : "white",
							color: errors[field] ? "var(--red-color)" : "var(--text-color)",
						});

						return (
							<div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "start" }}>
								{/* from */}
								<div style={{ display: "flex", flexDirection: "column" }}>
									<input
										type="number"
										value={formatValue(rule.from)}
										onChange={(e) => handleChange(index, "from", e.target.value)}
										style={getInputStyle("from")}
										placeholder="не задано"
									/>
									{errors.from && (
										<span className="errorMessage" style={{ marginTop: "4px" }}>
											{errors.from}
										</span>
									)}
								</div>

								{/* to */}
								<div style={{ display: "flex", flexDirection: "column" }}>
									<input
										type="number"
										value={formatValue(rule.to)}
										onChange={(e) => handleChange(index, "to", e.target.value)}
										style={getInputStyle("to")}
										placeholder="не задано"
									/>
									{errors.to && (
										<span className="errorMessage" style={{ marginTop: "4px" }}>
											{errors.to}
										</span>
									)}
								</div>

								{/* type */}
								<div style={{ display: "flex", flexDirection: "column" }}>
									<select value={rule.type} onChange={(e) => handleChange(index, "type", e.target.value)}>
										<option value="%">%</option>
										<option value="₽">₽</option>
									</select>
								</div>

								{/* value */}
								<div style={{ display: "flex", flexDirection: "column" }}>
									<input
										type="number"
										value={formatValue(rule.value)}
										onChange={(e) => handleChange(index, "value", e.target.value)}
										style={getInputStyle("value")}
										placeholder="наценка"
									/>
									{errors.value && (
										<span className="errorMessage" style={{ marginTop: "4px" }}>
											{errors.value}
										</span>
									)}
								</div>

								{/* delete */}
								<div style={{ display: "flex", alignItems: "center", height: "100%", paddingTop: "4px" }}>
									<button onClick={() => handleRemove(index)} className="removeButton" style={{ fontSize: "12px" }}>
										Удалить
									</button>
								</div>
							</div>
						);
					})}
				</div>

				<button onClick={handleAdd} className="moveButton" style={{ fontSize: "14px", marginBottom: "16px" }}>
					+ Добавить правило
				</button>

				<div style={{ paddingTop: "16px", borderTop: "1px solid var(--grey-color)", marginTop: "16px" }}>
					<label style={{ fontWeight: "500", fontSize: "14px", marginRight: "8px" }}>Стандартная наценка:</label>
					<select value={defaultMarkup.type} onChange={(e) => setDefaultMarkup({ ...defaultMarkup, type: e.target.value as "%" | "₽" })} style={{ marginRight: "8px" }}>
						<option value="%">%</option>
						<option value="₽">₽</option>
					</select>
					<input
						type="number"
						value={defaultMarkup.value}
						onChange={(e) => setDefaultMarkup({ ...defaultMarkup, value: Number(e.target.value) })}
						style={{ width: "96px" }}
					/>
				</div>
			</div>
		</>
	);
}
