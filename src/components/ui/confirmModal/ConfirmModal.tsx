"use client";

import React from "react";

type ConfirmModalProps = {
	open: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmModal({ open, title, message, confirmText = "Удалить", cancelText = "Отмена", onConfirm, onCancel }: ConfirmModalProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
			<div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-lg">
				<h2 className="text-lg font-semibold mb-3">{title}</h2>
				<p className="text-sm text-gray-700 mb-4">{message}</p>
				<div className="flex justify-end gap-3">
					<button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">
						{cancelText}
					</button>
					<button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600">
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
