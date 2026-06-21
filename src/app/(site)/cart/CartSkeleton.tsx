import styles from "./styles.module.scss";

export default function CartSkeleton() {
	return (
		<div className={styles.cartLayout}>
			<div className={styles.itemsSection}>
				<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.short}`} />

				<div className={styles.cartItems}>
					{[1, 2, 3].map((item) => (
						<div key={item} className={styles.skeletonItem}>
							<div className={`${styles.skeletonMedia} ${styles.skeletonShimmer}`} />
							<div className={styles.skeletonLines}>
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.wide}`} />
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.medium}`} />
								<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.short}`} />
							</div>
							<div className={`${styles.skeletonLine} ${styles.skeletonShimmer} ${styles.medium}`} />
						</div>
					))}
				</div>
			</div>

			<div className={`${styles.skeletonAside} ${styles.skeletonShimmer}`} />
		</div>
	);
}
