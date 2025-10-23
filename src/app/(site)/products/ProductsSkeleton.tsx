import styles from "./styles.module.scss";
import "../skeleton-styles.scss";

// Компонент скелетона для списка товаров
// Показывает анимированные заглушки только для списка товаров
export default function ProductsSkeleton() {
	return (
		<div className={styles.productsList}>
			{Array.from({ length: 6 }).map((_, index) => (
				<div
					key={index}
					className={`${styles.productItem} skeletonProductListItem`}
					style={
						{
							"--index": index,
							animationDelay: `${index * 0.1}s`,
						} as React.CSSProperties
					}
				>
					{/* Скелетон для изображения товара */}
					<div className={`${styles.imageBlock} skeletonProductListImage`}>
						<div className="skeletonShimmer"></div>
					</div>

					{/* Скелетон для информации о товаре */}
					<div className={styles.productInfo}>
						{/* Скелетон для названия товара - делаем разной длины */}
						<div
							className="skeletonProductListTitle skeletonShimmer"
							style={{
								width: `${75 + (index % 4) * 10}%`,
								animationDelay: `${index * 0.1 + 0.2}s`,
							}}
						></div>

						{/* Скелетон для блока с ценой и тегами */}
						<div className={styles.productInfoBlock}>
							{/* Скелетон для цены */}
							<div className="skeletonProductListPrice skeletonShimmer" style={{ animationDelay: `${index * 0.1 + 0.4}s` }}></div>

							{/* Скелетон для тегов - разное количество */}
							{Array.from({ length: 2 + (index % 3) }).map((_, tagIndex) => (
								<div
									key={tagIndex}
									className="skeletonProductListTag skeletonShimmer"
									style={{
										width: `${50 + (tagIndex % 2) * 20}px`,
										animationDelay: `${index * 0.1 + 0.6 + tagIndex * 0.1}s`,
									}}
								></div>
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
