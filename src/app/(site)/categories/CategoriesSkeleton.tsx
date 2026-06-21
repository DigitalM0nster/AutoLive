import styles from "./styles.module.scss";

export default function CategoriesSkeleton() {
	return (
		<div className={styles.categoryGrid}>
			{Array.from({ length: 6 }).map((_, index) => (
				<div key={index} className={`${styles.skeletonCard} skeletonCategoryItem`}>
					<div className={`${styles.skeletonIcon} ${styles.skeletonShimmer}`} />
					<div className={`${styles.skeletonTitle} ${styles.skeletonShimmer}`} style={{ maxWidth: `${68 + (index % 3) * 10}%` }} />
					<div className={`${styles.skeletonDesc} ${styles.skeletonShimmer}`} />
					<div className={`${styles.skeletonArrow} ${styles.skeletonShimmer}`} />
				</div>
			))}
		</div>
	);
}
