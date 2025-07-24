// src\components\ui\dataError\DataError.tsx

import React from "react";

type DataErrorProps = {
	message?: string;
	code?: string;
};

export default function DataError({
	message = "Не удалось подключиться к базе данных. Пожалуйста, проверьте настройки или попробуйте позже.",
	code = "DB_CONNECTION_FAIL",
}: DataErrorProps) {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white to-red-50 px-4 py-12">
			<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-200 animate-fade-in">
				<div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600">
					<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856C18.403 19 20 17.403 20 15.5v-7C20 6.597 18.403 5 16.5 5h-9C5.597 5 4 6.597 4 8.5v7C4 17.403 5.597 19 7.5 19z"
						/>
					</svg>
				</div>
				<h1 className="text-2xl font-semibold text-red-700 mb-3">Ошибка</h1>
				<p className="text-gray-600 mb-4">{message}</p>
				<p className="text-sm text-gray-400">
					Код ошибки: <span className="text-red-500 font-mono">{code}</span>
				</p>
			</div>
		</div>
	);
}
