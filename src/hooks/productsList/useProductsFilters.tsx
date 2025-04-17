import { useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { useAuthStore } from "@/store/authStore";

export default function useProductsFilters({
	brandFilter,
	categoryFilter,
	search,
	onlyStale,
	departmentFilter,
}: {
	brandFilter: string;
	categoryFilter: string;
	search: string;
	onlyStale: boolean;
	departmentFilter: string;
}) {
	const { user } = useAuthStore();
	const [brands, setBrands] = useState<string[]>([]);
	const [categories, setCategories] = useState([]);
	const [departments, setDepartments] = useState([]);
	const [priceMin, setPriceMin] = useState(0);
	const [priceMax, setPriceMax] = useState(100000);
	const [maxPriceInDB, setMaxPriceInDB] = useState(100000);

	const debouncedSearch = useDebounce(search, 500);

	useEffect(() => {
		const fetchInitialData = async () => {
			const priceRangeRes = await fetch("/api/products/price-range");
			const priceRange = await priceRangeRes.json();
			setPriceMin(priceRange.minPrice);
			setPriceMax(priceRange.maxPrice);
			setMaxPriceInDB(priceRange.maxPrice);

			try {
				const params = new URLSearchParams();
				if (brandFilter) params.append("brand", brandFilter);
				if (categoryFilter) params.append("categoryId", categoryFilter);
				if (debouncedSearch) params.append("search", debouncedSearch);
				if (onlyStale) params.append("onlyStale", "true");

				if (user?.role === "superadmin" && departmentFilter && departmentFilter !== "__all__") {
					if (departmentFilter === "__none__") {
						params.append("withoutDepartment", "true");
					} else {
						params.append("departmentId", departmentFilter);
					}
				}

				const filtersRes = await fetch(`/api/products/filters?${params.toString()}`);
				const filtersData = await filtersRes.json();

				setBrands(filtersData.brands || []);
				setCategories(filtersData.categories || []);
				setDepartments(filtersData.departments || []);
			} catch (error) {
				console.error("Ошибка при загрузке фильтров", error);
			}
		};

		fetchInitialData();
	}, [user?.role, departmentFilter, brandFilter, categoryFilter, debouncedSearch, onlyStale]);

	return {
		brands,
		categories,
		departments,
		priceMin,
		setPriceMin,
		priceMax,
		setPriceMax,
		maxPriceInDB,
	};
}
