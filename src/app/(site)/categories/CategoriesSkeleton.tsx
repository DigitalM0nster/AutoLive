import styles from "./styles.module.scss";

// Компонент скелетона для карточек категорий
// Показывает анимированные заглушки во время загрузки данных
export default function CategoriesSkeleton() {
	return (
		<div className={`screenBlock ${styles.screenBlock}`}>
			{/* Создаем 8 скелетон-карточек для заполнения сетки */}
			{Array.from({ length: 8 }).map((_, index) => (
				<div key={index} className={`${styles.categoryItem} skeletonCategoryItem`} style={{ "--index": index } as React.CSSProperties}>
					<div className={styles.categoryTitleBlock}>
						{/* Скелетон для заголовка - делаем разной длины для реалистичности */}
						<div className="skeletonCategoryTitle skeletonShimmer" style={{ width: `${70 + (index % 3) * 15}%` }}></div>
						{/* Скелетон для кнопки */}
						<div className="skeletonCategoryButton skeletonShimmer"></div>
					</div>
					<div className={styles.categoryImageBlock}>
						{/* Скелетон для фонового элемента */}
						<div className="skeletonCategoryBackground skeletonShimmer"></div>
						{/* Скелетон для изображения */}
						<div className="skeletonCategoryImage skeletonShimmer"></div>
					</div>
				</div>
			))}
		</div>
	);
}
