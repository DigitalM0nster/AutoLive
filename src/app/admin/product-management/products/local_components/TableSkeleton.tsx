export default function TableSkeleton() {
	return (
		<>
			<div className="border border-gray-200 rounded overflow-hidden">
				{/* Заголовки */}
				<div className="flex bg-gray-100 border-b border-gray-300 text-sm font-semibold">
					{Array.from({ length: 7 }).map((_, idx) => (
						<div key={idx} className="p-2 w-full border-r last:border-r-0">
							<div className="h-4 bg-gray-300 rounded w-1/2" />
						</div>
					))}
				</div>

				{/* Строки */}
				{Array.from({ length: 10 }).map((_, rowIdx) => (
					<div key={rowIdx} className="flex border-b border-gray-200 animate-pulse">
						{Array.from({ length: 7 }).map((_, colIdx) => (
							<div key={colIdx} className="p-2 w-full border-r last:border-r-0">
								<div className="h-4 bg-gray-200 rounded" />
							</div>
						))}
					</div>
				))}
			</div>
		</>
	);
}
