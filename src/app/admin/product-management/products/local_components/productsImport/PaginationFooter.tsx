"use client";

import { memo } from "react";
import Pagination from "@/components/ui/pagination/Pagination";

type PaginationFooterProps = {
	totalRows: number | null;
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
};

const PaginationFooter = memo(function PaginationFooter({ totalRows, currentPage, totalPages, onPageChange }: PaginationFooterProps) {
	if (totalRows === null) return null;

	return (
		<div className="pricelistPreviewFooter">
			<p className="pricelistPreviewTotalRows">Всего строк: {totalRows}</p>
			<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
		</div>
	);
});

export default PaginationFooter;
