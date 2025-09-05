// src\components\ui\loading\Loading.tsx

import styles from "./styles.module.scss";

export default function Loading({ white = false }: { white?: boolean }) {
	return (
		<div className={`${styles.loadingBlock} ${white ? styles.white : ""}`}>
			<div className={styles.loadingIcon} />
			<div className={`${styles.loadingText}`}>Загрузка...</div>
		</div>
	);
}
