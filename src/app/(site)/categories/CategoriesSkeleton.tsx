import styles from "./styles.module.scss";

// Компонент скелетона для карточек категорий
// Показывает анимированные заглушки во время загрузки данных
export default function CategoriesSkeleton() {
	return (
		<div className={`screenBlock ${styles.screenBlock}`}>
			{/* Создаем 8 скелетон-карточек для заполнения сетки */}
			{Array.from({ length: 8 }).map((_, index) => (
				<div key={index} className={`${styles.categoryItem} ${styles.skeletonItem}`} style={{ "--index": index } as React.CSSProperties}>
					<div className={styles.categoryTitleBlock}>
						{/* Скелетон для заголовка - делаем разной длины для реалистичности */}
						<div className={`${styles.skeletonTitle} ${styles.skeletonShimmer}`} style={{ width: `${70 + (index % 3) * 15}%` }}></div>
						{/* Скелетон для кнопки */}
						<div className={`${styles.skeletonButton} ${styles.skeletonShimmer}`}></div>
					</div>
					<div className={styles.categoryImageBlock}>
						{/* Скелетон для фонового элемента */}
						<div className={`${styles.skeletonBackground} ${styles.skeletonShimmer}`}></div>
						{/* Скелетон для изображения */}
						<div className={`${styles.skeletonImage} ${styles.skeletonShimmer}`}></div>
					</div>
				</div>
			))}
		</div>
	);
}
