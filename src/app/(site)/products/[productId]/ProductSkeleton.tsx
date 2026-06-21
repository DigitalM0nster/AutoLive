import styles from "./styles.module.scss";

export default function ProductSkeleton() {
	return (
		<article className={styles.productPage}>
			<div className={styles.productSheet}>
				<div className={styles.productTop}>
					<div className={`${styles.skeletonMedia} ${styles.skeletonShimmer}`} />

					<div className={styles.summary}>
						<div className={styles.summaryHead}>
							<div className={`${styles.skeletonLink} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonTitle} ${styles.skeletonShimmer}`} />

							<div className={styles.skeletonFacts}>
								<div className={`${styles.skeletonFact} ${styles.skeletonShimmer} ${styles.label}`} />
								<div className={`${styles.skeletonFact} ${styles.skeletonShimmer} ${styles.value}`} />
								<div className={`${styles.skeletonFact} ${styles.skeletonShimmer} ${styles.label}`} />
								<div className={`${styles.skeletonFact} ${styles.skeletonShimmer} ${styles.value}`} />
							</div>
						</div>

						<div className={styles.summaryFoot}>
							<div className={`${styles.skeletonPrice} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonQuantity} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonButton} ${styles.skeletonShimmer}`} />
							<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.medium}`} />
						</div>
					</div>
				</div>

				<div className={styles.skeletonSection}>
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.short}`} />
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.wide}`} />
					<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.medium}`} />
				</div>
			</div>
		</article>
	);
}
