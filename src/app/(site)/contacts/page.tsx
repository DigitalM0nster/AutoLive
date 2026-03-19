// Страница контактов — отображает контент из админки (адрес, телефон, режим работы, адреса для записей, пункты выдачи, карта)

import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import ContactsMap from "./local_components/ContactsMap";
import { ContactRow, ContactRowList } from "./local_components/ContactRow";
import styles from "./styles.module.scss";
import CONFIG from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
	title: `Контакты | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Свяжитесь с нами! Адрес, телефон и режим работы ${CONFIG.STORE_NAME} в ${CONFIG.CITY}. Быстрая обратная связь на ${CONFIG.DOMAIN}.`,
	keywords: `контакты ${CONFIG.STORE_NAME}, телефон ${CONFIG.STORE_NAME}, адрес ${CONFIG.CITY}, автосервис ${CONFIG.CITY}, как доехать ${CONFIG.STORE_NAME}, ${CONFIG.DOMAIN}`,
};

type ContactAddressItem = {
	id?: number;
	address: string;
	latitude: number | null;
	longitude: number | null;
	phones: string[];
	emails: string[];
	workingHours: string | null;
	sortOrder: number;
};

type ContactsContent = {
	address: string;
	phone: string;
	email: string;
	workingHours: string;
	mapNote: string;
	mapMarkerColor?: string;
	mapZoom?: number | null;
	addressesBlockTitle?: string;
	pickupBlockTitle?: string;
	contactAddresses?: ContactAddressItem[];
};

type AddressItem = {
	id: number;
	name: string | null;
	address: string;
	phones: string[];
	emails: string[];
	workingHours?: string | null;
	latitude?: number | null;
	longitude?: number | null;
};

async function getContactsData() {
	const baseUrl = CONFIG.BASE_URL;
	try {
		const [contentRes, departmentsRes, pointsRes] = await Promise.all([
			fetch(`${baseUrl}/api/contacts-content`, { next: { revalidate: 60 } }),
			fetch(`${baseUrl}/api/booking-departments/public`, { next: { revalidate: 60 } }),
			fetch(`${baseUrl}/api/pickup-points/public`, { next: { revalidate: 60 } }),
		]);

		const content: ContactsContent =
			contentRes.ok ?
				await contentRes.json()
			:	{ address: "", phone: "", email: "", workingHours: "", mapNote: "", mapMarkerColor: "", mapZoom: null, addressesBlockTitle: "", pickupBlockTitle: "", contactAddresses: [] };

		const departments: AddressItem[] = departmentsRes.ok && (await departmentsRes.json()) || [];
		const points: AddressItem[] = pointsRes.ok && (await pointsRes.json()) || [];

		return { content, departments, points };
	} catch (e) {
		console.warn("Ошибка загрузки контактов:", e);
		return {
			content: { address: "", phone: "", email: "", workingHours: "", mapNote: "", mapMarkerColor: "", mapZoom: null, addressesBlockTitle: "", pickupBlockTitle: "", contactAddresses: [] } as ContactsContent,
			departments: [] as AddressItem[],
			points: [] as AddressItem[],
		};
	}
}

function getMapPoints(
	contactAddresses: ContactAddressItem[],
	departments: AddressItem[],
	points: AddressItem[]
): { id: number; name: string | null; address: string; latitude: number; longitude: number }[] {
	const list: { id: number; name: string | null; address: string; latitude: number; longitude: number }[] = [];
	// Контактные адреса — всегда на карте
	contactAddresses.forEach((a, i) => {
		if (a.latitude != null && a.longitude != null) {
			list.push({ id: 200000 + i, name: null, address: a.address, latitude: a.latitude, longitude: a.longitude });
		}
	});
	departments.forEach((d) => {
		if (d.latitude != null && d.longitude != null) {
			list.push({ id: d.id, name: d.name, address: d.address, latitude: d.latitude, longitude: d.longitude });
		}
	});
	points.forEach((p) => {
		if (p.latitude != null && p.longitude != null) {
			list.push({ id: p.id + 100000, name: p.name, address: p.address, latitude: p.latitude, longitude: p.longitude });
		}
	});
	return list;
}

export default async function Contacts() {
	const { content, departments, points } = await getContactsData();
	const contactAddresses = content.contactAddresses ?? [];
	const hasContactAddresses = contactAddresses.length > 0;
	const hasMain = hasContactAddresses || !!(content.address || content.phone || content.email || content.workingHours);
	const mapPoints = getMapPoints(contactAddresses, departments, points);

	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={`screenBlock ${styles.screenBlock}`}>
					{hasMain && (
						<section className={styles.contactsSection}>
							<h2 className={styles.contactsSectionTitle}>Контактная информация</h2>
							{hasContactAddresses ? (
								<ul className={styles.contactsAddressList}>
									{contactAddresses.map((addr, i) => (
										<li key={addr.id ?? i} className={styles.contactsAddressItem}>
											{addr.address && <ContactRow type="address" secondary iconClassName={styles.contactsIconColor}>{addr.address}</ContactRow>}
											{addr.phones?.length > 0 && (
												<ContactRowList type="phone" items={addr.phones} secondary iconClassName={styles.contactsIconColor} />
											)}
											{addr.emails?.length > 0 && (
												<ContactRowList type="email" items={addr.emails} secondary iconClassName={styles.contactsIconColor} />
											)}
											{addr.workingHours && (
												<ContactRow type="hours" secondary iconClassName={styles.contactsIconColor}>{addr.workingHours}</ContactRow>
											)}
										</li>
									))}
								</ul>
							) : (
								<div className={styles.contactsMainBlock}>
									{content.address && <ContactRow type="address" iconClassName={styles.contactsIconColor}>{content.address}</ContactRow>}
									{content.phone && <ContactRow type="phone" iconClassName={styles.contactsIconColor}>{content.phone}</ContactRow>}
									{content.email && <ContactRow type="email" iconClassName={styles.contactsIconColor}>{content.email}</ContactRow>}
									{content.workingHours && <ContactRow type="hours" iconClassName={styles.contactsIconColor}>{content.workingHours}</ContactRow>}
								</div>
							)}
							{content.mapNote && <p className={styles.contactsText}>{content.mapNote}</p>}
						</section>
					)}

					{mapPoints.length > 0 && (
						<section className={styles.contactsSection}>
							<ContactsMap points={mapPoints} markerColor={content.mapMarkerColor} initialZoom={content.mapZoom ?? undefined} />
						</section>
					)}

					{departments.length > 0 && (
						<section className={styles.contactsSection}>
							{content.addressesBlockTitle?.trim() && (
								<h2 className={styles.contactsSectionTitle}>{content.addressesBlockTitle.trim()}</h2>
							)}
							<ul className={styles.contactsAddressList}>
								{departments.map((d) => (
									<li key={d.id} className={styles.contactsAddressItem}>
										<span className={styles.contactsAddressName}>{d.name || "Адрес"}</span>
										<ContactRow type="address" secondary iconClassName={styles.contactsIconColor}>{d.address}</ContactRow>
										{d.phones?.length > 0 && (
											<ContactRowList type="phone" items={d.phones} secondary iconClassName={styles.contactsIconColor} />
										)}
										{d.emails?.length > 0 && (
											<ContactRowList type="email" items={d.emails} secondary iconClassName={styles.contactsIconColor} />
										)}
										{d.workingHours && (
											<ContactRow type="hours" secondary iconClassName={styles.contactsIconColor}>{d.workingHours}</ContactRow>
										)}
									</li>
								))}
							</ul>
						</section>
					)}

					{points.length > 0 && (
						<section className={styles.contactsSection}>
							{content.pickupBlockTitle?.trim() && (
								<h2 className={styles.contactsSectionTitle}>{content.pickupBlockTitle.trim()}</h2>
							)}
							<ul className={styles.contactsAddressList}>
								{points.map((p) => (
									<li key={p.id} className={styles.contactsAddressItem}>
										<span className={styles.contactsAddressName}>{p.name || "Пункт выдачи"}</span>
										<ContactRow type="address" secondary iconClassName={styles.contactsIconColor}>{p.address}</ContactRow>
										{p.phones?.length > 0 && (
											<ContactRowList type="phone" items={p.phones} secondary iconClassName={styles.contactsIconColor} />
										)}
										{p.emails?.length > 0 && (
											<ContactRowList type="email" items={p.emails} secondary iconClassName={styles.contactsIconColor} />
										)}
										{p.workingHours && (
											<ContactRow type="hours" secondary iconClassName={styles.contactsIconColor}>{p.workingHours}</ContactRow>
										)}
									</li>
								))}
							</ul>
						</section>
					)}

					{!hasMain && departments.length === 0 && points.length === 0 && (
						<p className={styles.contactsText}>Контент страницы контактов пока не заполнен. Заполните его в разделе админки «Контент» → «Контакты».</p>
					)}
				</div>
			</div>
		</div>
	);
}
