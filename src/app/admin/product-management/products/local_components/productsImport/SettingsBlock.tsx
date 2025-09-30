"use client";

import { memo } from "react";

type SettingsBlockProps = {
	startRow: number;
	setStartRow: (row: number) => void;
	preserveImages: boolean;
	setPreserveImages: (value: boolean) => void;
	isSuperadmin: boolean;
	selectedDepartmentId: number | null;
	setSelectedDepartmentId: (id: number | null) => void;
	availableDepartments: { id: number; name: string }[];
};

const SettingsBlock = memo(function SettingsBlock({
	startRow,
	setStartRow,
	preserveImages,
	setPreserveImages,
	isSuperadmin,
	selectedDepartmentId,
	setSelectedDepartmentId,
	availableDepartments,
}: SettingsBlockProps) {
	return (
		<div className="pricelsitSettingsBlock">
			<h3 className="borderBlockHeader">Настройки импорта</h3>

			<div className="settingsList">
				<div className="settingItem">
					<label className="label">Начинать импорт с строки №:</label>
					<input type="number" min={1} value={startRow} onChange={(e) => setStartRow(Number(e.target.value))}></input>
				</div>

				{isSuperadmin && (
					<div className="settingItem">
						<label className="label">Выберите отдел:</label>
						<select value={selectedDepartmentId ?? ""} onChange={(e) => setSelectedDepartmentId(Number(e.target.value))}>
							<option value="">— Не выбран —</option>
							{availableDepartments.map((d) => (
								<option key={d.id} value={d.id}>
									{d.name}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="settingItem">
					<label className="label checkboxLabel">
						Сохранять изображения у уже существующих товаров
						<input type="checkbox" checked={preserveImages} onChange={(e) => setPreserveImages(e.target.checked)} />
					</label>
				</div>
			</div>
		</div>
	);
});

export default SettingsBlock;
