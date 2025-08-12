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
		<div className="errorContainer">
			<h1 className="">Ошибка</h1>
			<p className="">{message}</p>
			<p className="">
				Код ошибки: <span className="">{code}</span>
			</p>
		</div>
	);
}
