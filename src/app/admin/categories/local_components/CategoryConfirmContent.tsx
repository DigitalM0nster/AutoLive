"use client";

import {
	ConfirmSummary,
	ConfirmSummaryDiff,
	ConfirmSummaryGroup,
	ConfirmSummaryGroupItem,
	ConfirmSummaryIntro,
	ConfirmSummaryList,
	ConfirmSummaryRow,
} from "@/components/ui/confirmPopup/ConfirmSummary";
import { CategoryFilter } from "@/lib/types";

type CategoryConfirmContentProps = {
	isCreateMode: boolean;
	categoryTitle: string;
	formTitle: string;
	formVisibleOnSite: boolean;
	imagePreview: string;
	hasNewImage: boolean;
	filters: CategoryFilter[];
	editChanges: React.ReactNode;
};

export default function CategoryConfirmContent({
	isCreateMode,
	categoryTitle,
	formTitle,
	formVisibleOnSite,
	imagePreview,
	hasNewImage,
	filters,
	editChanges,
}: CategoryConfirmContentProps) {
	const nonEmptyFilters = filters.filter((filter) => filter.title.trim() !== "");

	const filterTypeLabel = (type: CategoryFilter["type"]) => {
		if (type === "select") return "Один выбор";
		if (type === "multi_select") return "Множественный выбор";
		if (type === "range") return "Диапазон";
		return "Да/Нет";
	};

	if (isCreateMode) {
		return (
			<ConfirmSummary>
				<ConfirmSummaryIntro>Проверьте данные перед созданием — после подтверждения категория появится в системе.</ConfirmSummaryIntro>
				<ConfirmSummaryList>
					<ConfirmSummaryRow label="Название" value={formTitle.trim() || "—"} />
					<ConfirmSummaryRow
						label="Изображение"
						value={hasNewImage || imagePreview ? "Будет загружено" : "Не добавлено"}
						imageUrl={imagePreview || undefined}
					/>
					<ConfirmSummaryRow label="На сайте" value={formVisibleOnSite ? "Показывать в «Материалы для ТО»" : "Скрыта"} />
					<ConfirmSummaryRow
						label="Фильтры"
						value={nonEmptyFilters.length > 0 ? `${nonEmptyFilters.length} шт.` : "Без фильтров"}
					/>
				</ConfirmSummaryList>
				{nonEmptyFilters.length > 0 && (
					<ConfirmSummaryGroup title="Список фильтров">
						{nonEmptyFilters.map((filter) => (
							<ConfirmSummaryGroupItem key={filter.id}>
								{filter.title.trim()} · {filterTypeLabel(filter.type)} · {filter.values.length} знач.
							</ConfirmSummaryGroupItem>
						))}
					</ConfirmSummaryGroup>
				)}
			</ConfirmSummary>
		);
	}

	return (
		<ConfirmSummary>
			<ConfirmSummaryIntro>
				Изменения будут сохранены для категории <strong>{categoryTitle}</strong>.
			</ConfirmSummaryIntro>
			{editChanges}
		</ConfirmSummary>
	);
}

type CategoryEditChangesProps = {
	changes: string[];
};

export function CategoryEditChanges({ changes }: CategoryEditChangesProps) {
	if (changes.length === 0) {
		return <ConfirmSummaryRow label="Изменения" value="Нет изменений для сохранения" />;
	}

	const elements: React.ReactNode[] = [];
	let currentFilterTitle = "";
	let currentFilterChanges: string[] = [];

	const flushFilterGroup = () => {
		if (!currentFilterTitle || currentFilterChanges.length === 0) return;

		elements.push(
			<ConfirmSummaryGroup key={`filter-${elements.length}`} title={`Фильтр «${currentFilterTitle}»`}>
				{currentFilterChanges.map((filterChange, changeIndex) => {
					const colonIndex = filterChange.indexOf(": ");
					const label = colonIndex >= 0 ? filterChange.slice(0, colonIndex) : filterChange;
					const values = colonIndex >= 0 ? filterChange.slice(colonIndex + 2) : "";
					const arrowIndex = values.indexOf(" → ");
					const from = arrowIndex >= 0 ? values.slice(0, arrowIndex) : values;
					const to = arrowIndex >= 0 ? values.slice(arrowIndex + 3) : "";

					return <ConfirmSummaryDiff key={changeIndex} label={label} from={from} to={to} />;
				})}
			</ConfirmSummaryGroup>
		);

		currentFilterTitle = "";
		currentFilterChanges = [];
	};

	changes.forEach((change, index) => {
		if (change.startsWith("FILTER_START:")) {
			flushFilterGroup();
			currentFilterTitle = change.replace("FILTER_START:", "");
			return;
		}

		if (change.startsWith("FILTER_CHANGE:")) {
			currentFilterChanges.push(change.replace("FILTER_CHANGE:", ""));
			return;
		}

		if (change === "FILTER_END") {
			flushFilterGroup();
			return;
		}

		const arrowIndex = change.indexOf(" → ");
		if (arrowIndex >= 0) {
			const labelEnd = change.indexOf(": ");
			const label = labelEnd >= 0 ? change.slice(0, labelEnd) : "Изменение";
			const values = labelEnd >= 0 ? change.slice(labelEnd + 2) : change;
			const splitIndex = values.indexOf(" → ");
			const from = values.slice(0, splitIndex);
			const to = values.slice(splitIndex + 3);

			elements.push(<ConfirmSummaryDiff key={`change-${index}`} label={label} from={from} to={to} />);
			return;
		}

		elements.push(
			<ConfirmSummaryRow key={`change-${index}`} label="Изменение" value={change} />
		);
	});

	flushFilterGroup();

	return <ConfirmSummaryList>{elements}</ConfirmSummaryList>;
}
