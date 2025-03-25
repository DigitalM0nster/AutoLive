import styles from "./styles.module.scss";

export default function Loading() {
	return (
		<div className={styles.loadingBlock}>
			<div className={styles.loadingIcon} />
			<div className={styles.loadingText}>Загрузка...</div>
		</div>
	);
}
