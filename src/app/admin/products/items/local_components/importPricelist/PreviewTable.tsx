// src\app\admin\products\items\local_components\importPricelist\PreviewTable.tsx

"use client";

type PreviewTableProps = {
	preview: any[][];
	totalRows: number | null;
};

export default function PreviewTable({ preview, totalRows }: PreviewTableProps) {
	if (!preview) return null;

	return (
		<div className="mb-4">
			<h3 className="font-semibold mb-1">Предпросмотр:</h3>
			<table className="table-auto border border-gray-300 text-sm w-full">
				<thead>
					<tr>
						{preview[0].map((_, idx) => (
							<th key={idx} className="border px-2 py-1 bg-gray-100 text-gray-600 font-semibold">
								#{idx + 1}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{preview.slice(0, 10).map((row, rowIndex) => (
						<tr key={rowIndex}>
							{row.map((cell, cellIndex) => (
								<td key={cellIndex} className="border px-2 py-1">
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>

			{totalRows !== null && <p className="text-sm text-gray-500 mt-2">Всего строк: {totalRows}</p>}
		</div>
	);
}
