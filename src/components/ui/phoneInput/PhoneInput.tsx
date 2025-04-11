// src\components\ui\phoneInput\PhoneInput.tsx

import React, { forwardRef } from "react";
import { PatternFormat, PatternFormatProps } from "react-number-format";

interface PhoneInputProps extends Omit<PatternFormatProps, "onValueChange" | "customInput" | "format" | "mask" | "type"> {
	value: string;
	onValueChange: (rawValue: string, formattedValue: string) => void;
	inputClassName?: string;
}

const CustomStyledInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
	// Здесь просто пробрасываем все полученные пропсы (включая className)
	return <input ref={ref} {...props} />;
});

export default function PhoneInput({ value, onValueChange, inputClassName = "", ...rest }: PhoneInputProps) {
	return (
		<PatternFormat
			customInput={CustomStyledInput}
			format="+7 (###) ###-##-##"
			mask="_"
			allowEmptyFormatting
			value={value}
			onValueChange={(values) => onValueChange(values.value, values.formattedValue)}
			autoComplete="off"
			type="tel"
			{...rest}
			// Передаём класс из пропсов, позволяя стилизовать инпут снаружи
			className={inputClassName}
		/>
	);
}
