"use client";

import React from "react";

type SearchDropdownInputProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	placeholder?: string;
	disabled?: boolean;
	autoFocus?: boolean;
	inputClassName?: string;
	hasError?: boolean;
	isActiveSearch?: boolean;
	showDropdown?: boolean;
	headerTitle?: string;
	onClose?: () => void;
	inputStyle?: React.CSSProperties;
	withContainer?: boolean;
	children?: React.ReactNode;
};

export default function SearchDropdownInput({
	id,
	value,
	onChange,
	onFocus,
	onBlur,
	placeholder,
	disabled = false,
	autoFocus = false,
	inputClassName = "",
	hasError = false,
	isActiveSearch = false,
	showDropdown = false,
	headerTitle,
	onClose,
	inputStyle,
	withContainer = true,
	children,
}: SearchDropdownInputProps) {
	const classes = [hasError ? "error" : "", isActiveSearch ? "activeSearch" : "", showDropdown ? "searching" : "", inputClassName]
		.filter(Boolean)
		.join(" ");

	const content = (
		<>
			{(headerTitle || onClose) && (
				<div className="searchHeader">
					{headerTitle ? <span>{headerTitle}</span> : <span />}
					{onClose && (
						<button type="button" onClick={onClose} className="closeSearchButton">
							×
						</button>
					)}
				</div>
			)}

			<input
				id={id}
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={onFocus}
				onBlur={onBlur}
				placeholder={placeholder}
				className={classes}
				disabled={disabled}
				autoFocus={autoFocus}
				style={inputStyle}
			/>

			{children}
		</>
	);

	if (!withContainer) {
		return content;
	}

	return <div className="searchContainer">{content}</div>;
}
