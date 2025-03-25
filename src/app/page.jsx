import Link from "next/link";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";
import OrderPopupButton from "@/components/orderPopup/OrderPopupButton";

// ✅ Динамическая генерация метаданных
export async function generateMetadata() {
	return {
		title: `Главная | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
		description: `Купите автозапчасти, материалы для ТО и записывайтесь на обслуживание в ${CONFIG.STORE_NAME}. Лучшие цены, доставка в ${CONFIG.CITY} и по всей России!`,
		keywords: `автозапчасти, ТО, комплект ТО, купить запчасти ${CONFIG.CITY}, ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
	};
}

// ✅ Главная страница (SSG)
export default function Home() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<div className={`screenBlock ${styles.screenBlock}`}>
					{/* 🔹 Выбрать запчасти с менеджером */}
					<div className={styles.block}>
						<div className={styles.blockName}>Выбрать запчасти с менеджером:</div>
						<div className={styles.blockContent}>
							<div className={styles.liveVideoBlock}>
								<div className={styles.liveVideo}>
									<video src="/videos/storeVideo.mp4" muted loop autoPlay controls={false}></video>
									<div className={styles.liveVideoText}>Прямой эфир из магазина</div>
								</div>
								<div className={styles.liveButtons}>
									<Link href="tel:+79991234567" className={`button ${styles.button} ${styles.callButton}`}>
										<div className={styles.buttonIcon}>
											<img src="/images/phoneIcon.svg" alt="Phone Icon" />
										</div>
										<div className={styles.buttonText}>Позвонить в магазин</div>
									</Link>
									<OrderPopupButton /> {/* 🔥 Клиентский компонент */}
								</div>
							</div>
						</div>
					</div>

					{/* 🔹 Выбрать запчасти самостоятельно */}
					<div className={styles.block}>
						<div className={styles.blockName}>Выбрать запчасти самостоятельно:</div>
						<div className={styles.blockContent}>
							<div className={styles.pagesBlock}>
								{[
									{ name: "Материалы для ТО", link: "/service-materials", img: "/images/maslo.svg" },
									{ name: "Комплекты ТО", link: "/service-kits", img: "/images/boxes.svg" },
									{ name: "Запись на ТО", link: "/service-booking", img: "/images/customerSupport.svg" },
									{ name: "Запчасти", link: "/catalog", img: "/images/tormoz.svg" },
								].map((item, index) => (
									<Link href={item.link} key={index} className={styles.pageItem}>
										<div className={styles.itemLeft}>
											<div className={styles.itemName}>{item.name}</div>
											<div className={styles.itemButton}>Перейти</div>
										</div>
										<div className={styles.itemRight}>
											<div className={styles.itemIcon}>
												<img src={item.img} alt={item.name} />
											</div>
										</div>
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
