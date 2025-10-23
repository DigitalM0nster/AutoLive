import styles from "./styles.module.scss";

// Компонент скелетона для страницы товара
// Показывает анимированные заглушки для карточки товара
export default function ProductSkeleton() {
	return (
		<div className={styles.productItem}>
			{/* Скелетон для изображения товара */}
			<div className={`${styles.imageBlock} skeletonImageBlock`}>
				<div className="skeletonImage skeletonShimmer"></div>
			</div>

			{/* Скелетон для блока фильтров */}
			<div className={`${styles.filtersBlock} skeletonFiltersBlock`}>
				<div className="skeletonFiltersTitle skeletonShimmer"></div>
				<div className={styles.filtersList}>
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={index} className={styles.filterItem}>
							<div className="skeletonFilterName skeletonShimmer"></div>
							<div className={styles.values}>
								<div className="skeletonFilterValue skeletonShimmer"></div>
								<div className="skeletonFilterValue skeletonShimmer"></div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Скелетон для блока описания */}
			<div className={styles.descriptionBlock}>
				<div className={styles.textBlock}>
					{/* Скелетон для заголовка */}
					<div className="skeletonProductTitle skeletonShimmer"></div>

					{/* Скелетон для описания */}
					<div className={styles.description}>
						<div className="skeletonDescriptionLine skeletonShimmer"></div>
						<div className="skeletonDescriptionLine skeletonShimmer"></div>
						<div className="skeletonDescriptionLine skeletonShimmer"></div>
						<div className="skeletonDescriptionLineShort skeletonShimmer"></div>
					</div>
				</div>

				{/* Скелетон для блока с ценой и кнопкой */}
				<div className={styles.buttonBlock}>
					<div className={styles.column}>
						<div className="skeletonPrice skeletonShimmer"></div>
						<div className="skeletonButton skeletonShimmer"></div>
					</div>
				</div>
			</div>

			{/* Скелетон для мобильного блока с ценой и кнопкой */}
			<div className={`${styles.buttonBlock} ${styles.mobile} skeletonMobileBlock`}>
				<div className={styles.column}>
					<div className="skeletonPrice skeletonShimmer"></div>
					<div className="skeletonButton skeletonShimmer"></div>
				</div>
			</div>
		</div>
	);
}
