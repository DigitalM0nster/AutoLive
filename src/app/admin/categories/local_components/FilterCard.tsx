import { CategoryFilter, FilterValue, FilterType } from "@/lib/types";
import { Trash2, Plus, X } from "lucide-react";
import styles from "./styles.module.scss";

interface FilterCardProps {
	filter: CategoryFilter;
	onDelete: () => void;
	onUpdateFilter: (filterId: number, updatedFilter: Partial<CategoryFilter>) => void;
	onAddValue: (value: Omit<FilterValue, "id">) => void;
	onUpdateValue: (valueId: number, updatedValue: Omit<FilterValue, "id">) => void;
	onDeleteValue: (valueId: number) => void;
	// Новые пропсы для ошибок валидации
	titleError?: string;
	valuesError?: string;
	// Новый пропс для ошибок конкретных значений
	valueErrors?: { [valueId: number]: string };
	onClearTitleError: () => void;
	onClearValuesError: () => void;
	// Новая функция для очистки ошибки конкретного значения
	onClearValueError: (valueId: number) => void;
}

export default function FilterCard({
	filter,
	onDelete,
	onUpdateFilter,
	onAddValue,
	onUpdateValue,
	onDeleteValue,
	titleError,
	valuesError,
	valueErrors,
	onClearTitleError,
	onClearValuesError,
	onClearValueError,
}: FilterCardProps) {
	const handleAddValue = () => {
		onAddValue({
			value: "",
		});
	};

	const handleValueChange = (valueId: number, newValue: string) => {
		onUpdateValue(valueId, {
			value: newValue,
		});
	};

	const handleFilterTitleChange = (newTitle: string) => {
		onUpdateFilter(filter.id, {
			title: newTitle,
		});
	};

	const handleFilterTypeChange = (newType: FilterType) => {
		onUpdateFilter(filter.id, {
			type: newType,
		});
	};

	return (
		<div className={`filterCard ${styles.filterCard} borderBlock`}>
			<div className={`filterHeader ${styles.filterHeader}`}>
				<div className={styles.inputBlock}>
					<div className={styles.inputDescription}>Название фильтра</div>
					<div className={styles.inputWrapper}>
						<input
							type="text"
							value={filter.title}
							onChange={(e) => {
								handleFilterTitleChange(e.target.value);
								// Очищаем ошибку при вводе
								if (e.target.value.trim()) {
									onClearTitleError();
								}
							}}
							className={`filterTitleInput ${styles.filterTitleInput} ${titleError ? "error" : ""}`}
							placeholder="Название фильтра"
						/>
						{titleError && <div className="errorMessage">{titleError}</div>}
					</div>
				</div>
				<div className={`filterActions ${styles.filterActions}`}>
					<div className={styles.inputDescription}> </div>
					<button type="button" onClick={onDelete} className={`button cancelButton ${styles.deleteButton}`} title="Удалить фильтр">
						<Trash2 size={16} />
						Удалить фильтр
					</button>
				</div>
			</div>

			<div className={`filterType ${styles.filterType}`}>
				<div className={styles.inputBlock}>
					<div className={styles.inputDescription}>Тип фильтра</div>
					<select value={filter.type} onChange={(e) => handleFilterTypeChange(e.target.value as FilterType)} className={`filterTypeSelect ${styles.filterTypeSelect}`}>
						<option value="select">Один выбор</option>
						<option value="multi_select">Множественный выбор</option>
						<option value="range">Диапазон</option>
						<option value="boolean">Да/Нет</option>
					</select>
				</div>
			</div>

			<div className={`filterValues ${styles.filterValues}`}>
				<div className={styles.inputBlock}>
					<div className={styles.inputDescription}>Значения фильтра ({filter.values.length})</div>
					<div className={`${styles.valuesList} ${valuesError ? "error" : ""} ${valuesError ? styles.error : ""}`}>
						{filter.values.length === 0 ? (
							<div className={`emptyValues ${styles.emptyValues} ${valuesError ? "errorMessage" : ""}`}>
								{valuesError ? <div className="errorMessage">{valuesError}</div> : <p>Значения не добавлены</p>}
							</div>
						) : (
							filter.values.map((value) => (
								<div key={value.id} className={`valueItem ${styles.valueItem}`}>
									<input
										type="text"
										value={value.value}
										onChange={(e) => {
											handleValueChange(value.id, e.target.value);
											// Очищаем ошибку конкретного значения при вводе
											if (e.target.value.trim()) {
												onClearValueError(value.id);
											}
										}}
										className={`valueInput ${styles.valueInput} ${filter.type === "boolean" ? styles.readonly : ""} ${valueErrors?.[value.id] ? "error" : ""} ${
											valueErrors?.[value.id] ? styles.error : ""
										}`}
										placeholder={valueErrors?.[value.id] ? "Заполните значение" : "Значение фильтра"}
										readOnly={filter.type === "boolean"}
									/>
									{filter.type !== "boolean" && (
										<button
											type="button"
											onClick={() => onDeleteValue(value.id)}
											className={`removeValueButton ${styles.removeValueButton}`}
											title="Удалить значение"
										>
											<X size={14} />
										</button>
									)}
								</div>
							))
						)}

						{/* Кнопка добавления значения */}
						{filter.type !== "boolean" && (
							<button type="button" onClick={handleAddValue} className={`addValueButton ${styles.addValueButton}`}>
								<Plus size={16} />
								Добавить значение
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
