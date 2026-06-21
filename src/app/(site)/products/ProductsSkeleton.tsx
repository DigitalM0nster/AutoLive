import styles from "./styles.module.scss";

const titleWidths = [styles.wide, styles.medium, styles.narrow] as const;

export default function ProductsSkeleton() {
	return (
		<div className={styles.catalogTable}>
			<div className={styles.catalogTableBody}>
				{Array.from({ length: 8 }).map((_, index) => (
					<div
						key={index}
						className={[styles.catalogTableRow, styles.skeletonRow, index === 7 ? styles.lastRow : ""].filter(Boolean).join(" ")}
					>
						<div className={[styles.productMedia, styles.skeletonShimmer].join(" ")} />
						<div className={styles.productMain}>
							<div className={[styles.skeletonLine, styles.skeletonShimmer, titleWidths[index % 3]].join(" ")} />
							<div className={[styles.skeletonLine, styles.skeletonShimmer, styles.short].join(" ")} />
						</div>
						<div className={styles.productMeta}>
							<div className={[styles.skeletonLine, styles.skeletonShimmer, styles.sku].join(" ")} />
							<div className={[styles.skeletonLine, styles.skeletonShimmer, styles.brand].join(" ")} />
							<div className={[styles.skeletonLine, styles.skeletonShimmer, styles.price].join(" ")} />
						</div>
						<div className={[styles.skeletonArrow, styles.skeletonShimmer].join(" ")} />
					</div>
				))}
			</div>
		</div>
	);
}
