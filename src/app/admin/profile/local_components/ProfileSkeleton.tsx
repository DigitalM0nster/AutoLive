export default function ProfileSkeleton() {
	return (
		<>
			<div className="max-w-2xl mx-auto mt-28 p-6 bg-white rounded-xl shadow border border-black/10 animate-pulse">
				<h1 className="text-2xl font-bold mb-6 text-center bg-gray-200 h-6 w-2/3 mx-auto rounded"></h1>

				<div className="flex flex-col items-center mb-8">
					<div className="relative">
						<div className="w-24 h-24 rounded-full bg-gray-200 border" />
						<div className="absolute bottom-0 right-0 w-6 h-6 bg-gray-300 rounded"></div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
					<div>
						<div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
						<div className="h-10 bg-gray-100 rounded"></div>
					</div>
					<div>
						<div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
						<div className="h-10 bg-gray-100 rounded"></div>
					</div>
					<div className="sm:col-span-2">
						<div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
						<div className="h-10 bg-gray-100 rounded"></div>
					</div>
				</div>

				<div className="border-t pt-4 mb-8">
					<div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="h-10 bg-gray-100 rounded"></div>
						<div className="h-10 bg-gray-100 rounded"></div>
					</div>
				</div>

				<div className="text-center">
					<div className="w-40 h-10 bg-gray-300 rounded mx-auto" />
				</div>
			</div>
		</>
	);
}
