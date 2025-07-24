import React from "react";
import UsersLogs from "../local_components/UsersLogs";

export default function UsersLogsPage() {
	return (
		<div className="pageContainer">
			<div className="pageHeader">
				<h1 className="pageTitle">Логи изменений пользователей</h1>
				<p className="pageDescription">История всех изменений пользователей в системе</p>
			</div>
			<UsersLogs />
		</div>
	);
}
