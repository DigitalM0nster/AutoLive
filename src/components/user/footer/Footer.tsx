"use client";

import { useRouter } from "next/navigation";
import styles from "./styles.module.scss";

export default function Footer() {
	const router = useRouter();

	return (
		<div className={styles.footer}>
			<div className={styles.footerContent}>
				<div className={styles.leftBlock}>
					<div className={styles.blockName}>Навигация по сайту</div>
					<div className={styles.blockContent}>
						<div className={styles.navUl}>
							{[
								{ label: "Материалы для ТО", path: "/service-materials" },
								{ label: "Комплеты ТО", path: "/service-kits" },
								{ label: "Запись на ТО", path: "/booking" },
								{ label: "Запчасти", path: "/catalog" },
								{ label: "Акции", path: "/discounts" },
								{ label: "Контакты", path: "/contacts" },
							].map((item) => (
								<div key={item.path} className={styles.navLi} onClick={() => router.push(item.path)}>
									{item.label}
								</div>
							))}
						</div>
					</div>
				</div>

				<div className={styles.rightBlock}>
					<div className={styles.blockName}>Контакты</div>
					<div className={styles.blockContent}>
						<div className={styles.contactItems}>
							<div className={`${styles.contactItem} ${styles.phone}`}>
								<div className={styles.iconGroup}>
									<div className={styles.icon}>
										<img src="/images/phoneIcon.svg" alt="phone" />
									</div>
									<div className={styles.itemName}>+7 (961) 692-88-16</div>
								</div>
							</div>

							<div className={styles.contactItem}>
								<div className={styles.iconGroup}>
									<div className={styles.icon}>
										<img src="/images/cartIcon.svg" alt="pickup" />
									</div>
									<div className={styles.itemName}>Пункты выдачи:</div>
								</div>
								<div className={styles.column}>
									<div className={styles.text}>пр.Ленина, 126Б</div>
									<div className={styles.text}>ул.40 домиков, 3</div>
								</div>
							</div>

							<div className={styles.contactItem}>
								<div className={styles.iconGroup}>
									<div className={styles.icon}>
										<img src="/images/serviceIcon.svg" alt="service" />
									</div>
									<div className={styles.itemName}>Адреса сервисов:</div>
								</div>
								<div className={styles.column}>
									<div className={styles.text}>пр.Ленина, 126Б</div>
									<div className={styles.text}>ул.40 домиков, 3</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
