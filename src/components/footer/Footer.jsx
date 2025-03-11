"use client"; // Указываем, что компонент клиентский

import { useRouter } from "next/navigation"; // Заменяем useNavigate на useRouter
import styles from "./styles.module.scss";

export default function Footer() {
	const router = useRouter(); // Используем useRouter вместо useNavigate

	return (
		<>
			<div className={styles.footer}>
				<div className={styles.footerContent}>
					<div className={styles.leftBlock}>
						<div className={styles.blockName}>Навигация по сайту</div>
						<div className={styles.blockContent}>
							<div className={styles.navUl}>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/service-materials");
									}}
								>
									Материалы для ТО
								</div>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/service-kits");
									}}
								>
									Комплеты ТО
								</div>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/service-booking");
									}}
								>
									Запись на ТО
								</div>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/catalog");
									}}
								>
									Запчасти
								</div>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/discounts");
									}}
								>
									Акции
								</div>
								<div
									className={styles.navLi}
									onClick={() => {
										router.push("/contacts");
									}}
								>
									Контакты
								</div>
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
											<img src="/images/phoneIcon.svg" />
										</div>
										<div className={styles.itemName}>+7 (961) 692-88-16</div>
									</div>
								</div>
								<div className={styles.contactItem}>
									<div className={styles.iconGroup}>
										<div className={styles.icon}>
											<img src="/images/cartIcon.svg" />
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
											<img src="/images/serviceIcon.svg" />
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
		</>
	);
}
