import Link from "next/link";
import styles from "./not-found.module.scss";

export default function NotFound() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<div className={styles.content}>
					<div className={styles.code}>404</div>
					<h1 className={styles.title}>Страница не найдена</h1>
					<p className={styles.text}>Запрашиваемая страница не существует или была удалена.</p>
					<Link href="/" className={`button ${styles.homeButton}`}>
						Вернуться на главную
					</Link>
				</div>
			</div>
		</div>
	);
}
