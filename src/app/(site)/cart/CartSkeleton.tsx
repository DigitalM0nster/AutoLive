import styles from "./styles.module.scss";

export default function CartSkeleton() {
	return (
		<div className={styles.cartContainer}>
			<div className="skeleton" style={{ width: "200px", height: "40px" }}></div>

			<div className={styles.cartItems}>
				{[1, 2, 3].map((item) => (
					<div key={item} className={styles.cartItem}>
						<div className="skeleton" style={{ width: "150px", height: "150px", borderRadius: "10px" }}></div>

						<div className={styles.itemInfo}>
							<div className="skeleton" style={{ width: "200px", height: "24px" }}></div>
							<div style={{ gap: "10px" }}>
								<div className="skeleton" style={{ width: "150px", height: "20px" }}></div>
								<div className="skeleton" style={{ width: "150px", height: "20px" }}></div>
							</div>
						</div>

						<div className="skeleton" style={{ width: "150px", height: "40px" }}></div>
					</div>
				))}
			</div>
		</div>
	);
}
