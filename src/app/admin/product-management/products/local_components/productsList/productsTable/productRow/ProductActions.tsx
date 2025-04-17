type Props = {
	isEditing: boolean;
	isSaving: boolean;
	onEdit: () => void;
	onSave: () => void;
	onCancel: () => void;
	onDelete: () => void;
	isNew: boolean;
};

export default function ProductActions({ isEditing, isSaving, onEdit, onSave, onCancel, onDelete, isNew }: Props) {
	if (isEditing) {
		return (
			<>
				<button onClick={onSave} disabled={isSaving} className="text-green-600 hover:underline text-xs mr-2">
					{isSaving ? "Сохраняем..." : "Сохранить"}
				</button>
				<button onClick={onCancel} className="text-gray-600 hover:underline text-xs">
					Отмена
				</button>
			</>
		);
	}

	return (
		<>
			<button onClick={onEdit} className="text-blue-600 hover:underline text-xs mr-2">
				Редактировать
			</button>
			<button onClick={onDelete} className="text-red-600 hover:underline text-xs">
				Удалить
			</button>
		</>
	);
}
