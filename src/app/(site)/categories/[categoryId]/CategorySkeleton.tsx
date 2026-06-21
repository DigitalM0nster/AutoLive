import styles from "./styles.module.scss";

export default function CategorySkeleton() {
	return (
		<>
			<div className={`${styles.skeletonPageTitle} ${styles.skeletonShimmer}`} />

			<div className={styles.skeletonHeaderRow}>
				<div className={`${styles.skeletonHeroIcon} ${styles.skeletonShimmer}`} />
				<div className={styles.skeletonHeaderText}>
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.short}`} />
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.wide}`} />
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.full}`} />
				</div>
			</div>

			<div className={styles.catalogLayout}>
				<div className={`${styles.skeletonFilterPanel} ${styles.skeletonShimmer}`} />

				<div className={styles.catalogMain}>
					<div className={`${styles.skeletonToolbar} ${styles.skeletonShimmer}`} />

					<div className={styles.skeletonGrid}>
						{Array.from({ length: 6 }).map((_, index) => (
							<div key={index} className={styles.skeletonCard}>
								<div className={`${styles.skeletonImage} ${styles.skeletonShimmer}`} />
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.short}`} />
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.full}`} />
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.medium}`} />
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
