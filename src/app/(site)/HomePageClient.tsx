"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./styles.module.scss";
import OrderPopupButton from "@/components/user/orderPopup/OrderPopupButton";
import { HomepageContentData } from "@/app/api/homepage-content/route";

export default function HomePageClient() {
	const [content, setContent] = useState<HomepageContentData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadContent();
	}, []);

	const loadContent = async () => {
		try {
			const response = await fetch("/api/homepage-content");
			if (response.ok) {
				const data = await response.json();
				setContent(data);
			}
		} catch (error) {
			console.error("Ошибка загрузки контента главной страницы:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading || !content) {
		// Показываем дефолтные значения пока загружается
		return (
			<div className={`screenBlock ${styles.screenBlock}`}>
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
								<OrderPopupButton />
							</div>
						</div>
					</div>
				</div>

				<div className={styles.block}>
					<div className={styles.blockName}>Выбрать запчасти самостоятельно:</div>
					<div className={styles.blockContent}>
						<div className={styles.pagesBlock}>
							{[
								{ name: "Материалы для ТО", link: "/categories", img: "/images/maslo.svg" },
								{ name: "Комплекты ТО", link: "/service-kits", img: "/images/boxes.svg" },
								{ name: "Запись на ТО", link: "/booking", img: "/images/customerSupport.svg" },
								{ name: "Запчасти", link: "/products", img: "/images/tormoz.svg" },
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
		);
	}

	return (
		<div className={`screenBlock ${styles.screenBlock}`}>
			{/* 🔹 Выбрать запчасти с менеджером */}
			<div className={styles.block}>
				<div className={styles.blockName}>{content.firstBlockTitle}</div>
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
								<div className={styles.buttonText}>{content.callButtonText}</div>
							</Link>
							<OrderPopupButton buttonText={content.orderButtonText} formData={content} />
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
							{ name: "Материалы для ТО", link: "/categories", img: "/images/maslo.svg" },
							{ name: "Комплекты ТО", link: "/service-kits", img: "/images/boxes.svg" },
							{ name: "Запись на ТО", link: "/booking", img: "/images/customerSupport.svg" },
							{ name: "Запчасти", link: "/products", img: "/images/tormoz.svg" },
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
	);
}
