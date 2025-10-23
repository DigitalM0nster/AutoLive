import styles from "./styles.module.scss";

// Компонент скелетона для страницы категории
// Показывает анимированные заглушки для панели фильтров, сортировки и списка товаров
export default function CategorySkeleton() {
	return (
		<>
			{/* Скелетон для заголовка */}
			<div className="skeletonPageTitle skeletonShimmer"></div>

			<div className={styles.materialContainer}>
				{/* Скелетон для панели сортировки */}
				<div className={styles.block}>
					<div className="skeletonSortingPanel skeletonShimmer">
						<div className="skeletonSortingItem"></div>
						<div className="skeletonSortingItem"></div>
						<div className="skeletonSortingItem"></div>
					</div>
				</div>

				{/* Основной блок с фильтрами и товарами */}
				<div className={styles.block}>
					<div className="skeletonMainBlock">
						{/* Скелетон для панели фильтров */}
						<div className={`${styles.filterPanel} skeletonFilterPanel`}>
							<div className="skeletonFilterSection">
								<div className="skeletonFilterTitle skeletonShimmer"></div>
								<div className="skeletonFilterOptions">
									{Array.from({ length: 4 }).map((_, index) => (
										<div key={index} className="skeletonFilterOption skeletonShimmer"></div>
									))}
								</div>
							</div>

							<div className="skeletonFilterSection">
								<div className="skeletonFilterTitle skeletonShimmer"></div>
								<div className="skeletonFilterOptions">
									{Array.from({ length: 3 }).map((_, index) => (
										<div key={index} className="skeletonFilterOption skeletonShimmer"></div>
									))}
								</div>
							</div>
						</div>

						{/* Скелетон для списка товаров */}
						<div className={styles.productsList}>
							{Array.from({ length: 8 }).map((_, index) => (
								<div key={index} className={`${styles.productItem} skeletonProductItem`}>
									{/* Скелетон для изображения товара */}
									<div className="skeletonProductImage skeletonShimmer"></div>

									{/* Скелетон для контента товара */}
									<div className={styles.itemContentBlock}>
										<div className="skeletonProductName skeletonShimmer"></div>
										<div className="skeletonProductPrice skeletonShimmer"></div>
										<div className="skeletonProductButton skeletonShimmer"></div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
