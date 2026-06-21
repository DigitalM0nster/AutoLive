"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import editorStyles from "./ContactsEditor.module.scss";
import ContactAddressCard from "./local_components/ContactAddressCard";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";

import type { ContactAddressItem } from "@/app/api/contacts-content/route";

export type ContactsContentData = {
	id?: number;
	address: string;
	phone: string;
	email: string;
	workingHours: string;
	mapNote: string;
	mapMarkerColor: string;
	mapZoom: number | null;
	addressesBlockTitle: string;
	pickupBlockTitle: string;
	contactAddresses: ContactAddressItem[];
};

type BookingDepartmentItem = { id: number; name: string | null; address: string; phones: string[]; emails: string[]; workingHours?: string | null };
type PickupPointItem = { id: number; name: string | null; address: string; phones: string[]; emails: string[]; workingHours?: string | null };

const emptyAddress = (sortOrder: number): ContactAddressItem => ({
	address: "",
	latitude: null,
	longitude: null,
	phones: [],
	emails: [],
	workingHours: null,
	sortOrder,
});

export default function AdminContactsContent() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [data, setData] = useState<ContactsContentData | null>(null);
	const [initialData, setInitialData] = useState<ContactsContentData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [hasChanges, setHasChanges] = useState(false);
	const [bookingDepartments, setBookingDepartments] = useState<BookingDepartmentItem[]>([]);
	const [pickupPoints, setPickupPoints] = useState<PickupPointItem[]>([]);

	useEffect(() => {
		loadData();
	}, []);

	useEffect(() => {
		const loadAddresses = async () => {
			try {
				const [depRes, pointsRes] = await Promise.all([
					fetch("/api/booking-departments", { credentials: "include" }),
					fetch("/api/pickup-points", { credentials: "include" }),
				]);
				if (depRes.ok) {
					const list = await depRes.json();
					setBookingDepartments(Array.isArray(list) ? list : []);
				}
				if (pointsRes.ok) {
					const list = await pointsRes.json();
					setPickupPoints(Array.isArray(list) ? list : []);
				}
			} catch {
				// Не блокируем страницу при ошибке загрузки списков адресов
			}
		};
		loadAddresses();
	}, []);

	useEffect(() => {
		if (!data || !initialData) {
			setHasChanges(false);
			return;
		}
		const changed =
			data.address !== initialData.address ||
			data.phone !== initialData.phone ||
			data.email !== initialData.email ||
			data.workingHours !== initialData.workingHours ||
			data.mapNote !== initialData.mapNote ||
			data.mapMarkerColor !== initialData.mapMarkerColor ||
			data.mapZoom !== initialData.mapZoom ||
			data.addressesBlockTitle !== initialData.addressesBlockTitle ||
			data.pickupBlockTitle !== initialData.pickupBlockTitle ||
			JSON.stringify(data.contactAddresses ?? []) !== JSON.stringify(initialData.contactAddresses ?? []);
		setHasChanges(changed);
	}, [data, initialData]);

	const loadData = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/contacts-content");
			if (!response.ok) throw new Error("Ошибка загрузки данных");
			const content = await response.json();
			const normalized = {
				...content,
				mapMarkerColor: content.mapMarkerColor ?? "",
				mapZoom: content.mapZoom ?? null,
				contactAddresses: Array.isArray(content.contactAddresses) ? content.contactAddresses : [],
			};
			setData(normalized);
			setInitialData(JSON.parse(JSON.stringify(normalized)));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!data) return;
		try {
			setSaving(true);
			setError(null);
			const response = await fetch("/api/contacts-content", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(data),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка сохранения");
			}
			const savedData = await response.json();
			setData(savedData);
			setInitialData(JSON.parse(JSON.stringify(savedData)));
			setHasChanges(false);
			showSuccessToast("Контакты сохранены");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!initialData) return;
		setData(JSON.parse(JSON.stringify(initialData)));
		setHasChanges(false);
	};

	const updateAddress = (index: number, item: ContactAddressItem) => {
		if (!data) return;
		const next = [...(data.contactAddresses ?? [])];
		next[index] = item;
		setData({ ...data, contactAddresses: next });
	};

	const removeAddress = (index: number) => {
		if (!data) return;
		setData({ ...data, contactAddresses: (data.contactAddresses ?? []).filter((_, i) => i !== index) });
	};

	const addAddress = () => {
		if (!data) return;
		setData({
			...data,
			contactAddresses: [...(data.contactAddresses ?? []), emptyAddress((data.contactAddresses ?? []).length)],
		});
	};

	const mapColorValue = data?.mapMarkerColor && /^#[0-9A-Fa-f]{6}$/.test(data.mapMarkerColor) ? data.mapMarkerColor : "#2c5aa0";

	const renderShell = (children: React.ReactNode) => (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Контакты</div>
				</div>
				<div className="tableContent">{children}</div>
			</div>
		</div>
	);

	if (loading) {
		return renderShell(<div className={styles.editorPlaceholder}>Загрузка...</div>);
	}

	if (!data) {
		return renderShell(<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
					<div className="tabTitle">Контакты</div>
				</div>

				<div className={`tableContent contentComponent ${styles.contentComponent} ${editorStyles.contactsEditor}`}>
					<div className={editorStyles.formHeader}>
						<h2>Страница «Контакты»</h2>
						<p>Точки на карте, настройки карты и заголовки блоков. Адреса для записей и пункты выдачи редактируются в своих разделах.</p>
					</div>

					<div className="formFields">
						{error && <div className={editorStyles.errorBlock}>{error}</div>}

						{/* Точки на карте */}
						<section className={editorStyles.editorCard}>
							<h3 className={editorStyles.cardTitle}>Точки на карте</h3>
							<p className={editorStyles.cardHint}>
								Каждая точка — отдельный адрес с координатами, телефонами, почтой и режимом работы. Все точки всегда видны на карте на сайте.
							</p>

							{(data.contactAddresses ?? []).map((item, index) => (
								<ContactAddressCard
									key={item.id ?? `new-${index}`}
									item={item}
									index={index}
									onChange={updateAddress}
									onRemove={removeAddress}
								/>
							))}

							<button type="button" className={editorStyles.addAddressSlot} onClick={addAddress}>
								+ Добавить точку на карте
							</button>
						</section>

						{/* Карта */}
						<section className={editorStyles.editorCard}>
							<h3 className={editorStyles.cardTitle}>Настройки карты</h3>

							<div className={editorStyles.fieldRow}>
								<div className={editorStyles.fieldGroup}>
									<label htmlFor="contacts-mapMarkerColor">Цвет меток</label>
									<div className={editorStyles.colorRow}>
										<input
											id="contacts-mapMarkerColor"
											type="color"
											value={mapColorValue}
											onChange={(e) => setData({ ...data, mapMarkerColor: e.target.value })}
											className={editorStyles.colorPicker}
										/>
										<input
											type="text"
											value={data.mapMarkerColor ?? ""}
											onChange={(e) => setData({ ...data, mapMarkerColor: e.target.value })}
											placeholder="#2c5aa0"
											className={editorStyles.colorHex}
										/>
									</div>
									<p className={editorStyles.fieldNote}>Формат #rrggbb — цвет точек на странице контактов.</p>
								</div>

								<div className={editorStyles.fieldGroup}>
									<label htmlFor="contacts-mapZoom">Масштаб</label>
									<input
										id="contacts-mapZoom"
										type="number"
										min={1}
										max={19}
										value={data.mapZoom != null ? String(data.mapZoom) : ""}
										onChange={(e) => {
											const v = e.target.value.trim();
											if (v === "") {
												setData({ ...data, mapZoom: null });
												return;
											}
											const n = parseInt(v, 10);
											if (!Number.isNaN(n)) setData({ ...data, mapZoom: Math.min(19, Math.max(1, n)) });
										}}
										placeholder="Авто"
									/>
									<p className={editorStyles.fieldNote}>От 1 до 19. Пусто — подбирается автоматически.</p>
								</div>
							</div>

							<div className={editorStyles.fieldGroup}>
								<label htmlFor="contacts-mapNote">Примечание к карте</label>
								<input
									id="contacts-mapNote"
									type="text"
									value={data.mapNote}
									onChange={(e) => setData({ ...data, mapNote: e.target.value })}
									placeholder="Короткая подсказка под картой на сайте"
								/>
							</div>
						</section>

						{/* Адреса для записей */}
						<section className={editorStyles.editorCard}>
							<h3 className={editorStyles.cardTitle}>Адреса для записей</h3>
							<p className={editorStyles.cardHint}>Список подтягивается из раздела «Адреса для записей». Здесь можно задать только заголовок блока на странице контактов.</p>

							<div className={editorStyles.fieldGroup}>
								<label htmlFor="contacts-addressesBlockTitle">Заголовок блока на сайте</label>
								<input
									id="contacts-addressesBlockTitle"
									type="text"
									value={data.addressesBlockTitle ?? ""}
									onChange={(e) => setData({ ...data, addressesBlockTitle: e.target.value })}
									placeholder="Например: Адреса для записей"
								/>
							</div>

							{bookingDepartments.length === 0 ? (
								<p className={editorStyles.emptyNote}>Пока нет адресов для записей.</p>
							) : (
								<ul className={editorStyles.linkedList}>
									{bookingDepartments.map((d) => (
										<li key={d.id} className={editorStyles.linkedItem}>
											<span className={editorStyles.linkedItemName}>{d.name || "Адрес"}</span>
											<span className={editorStyles.linkedItemAddress}>{d.address}</span>
											{d.phones?.length > 0 && <span className={editorStyles.linkedItemMeta}>Тел.: {d.phones.join(", ")}</span>}
											{d.emails?.length > 0 && <span className={editorStyles.linkedItemMeta}>Почта: {d.emails.join(", ")}</span>}
											<Link href={`/admin/booking-departments/${d.id}/edit`} className={editorStyles.linkedItemEdit}>
												Редактировать
											</Link>
										</li>
									))}
								</ul>
							)}

							<Link href="/admin/booking-departments" className={editorStyles.sectionLink}>
								Управлять адресами для записей →
							</Link>
						</section>

						{/* Пункты выдачи */}
						<section className={editorStyles.editorCard}>
							<h3 className={editorStyles.cardTitle}>Пункты выдачи</h3>
							<p className={editorStyles.cardHint}>Список подтягивается из раздела «Пункты выдачи». Здесь можно задать только заголовок блока.</p>

							<div className={editorStyles.fieldGroup}>
								<label htmlFor="contacts-pickupBlockTitle">Заголовок блока на сайте</label>
								<input
									id="contacts-pickupBlockTitle"
									type="text"
									value={data.pickupBlockTitle ?? ""}
									onChange={(e) => setData({ ...data, pickupBlockTitle: e.target.value })}
									placeholder="Например: Пункты выдачи"
								/>
							</div>

							{pickupPoints.length === 0 ? (
								<p className={editorStyles.emptyNote}>Пока нет пунктов выдачи.</p>
							) : (
								<ul className={editorStyles.linkedList}>
									{pickupPoints.map((p) => (
										<li key={p.id} className={editorStyles.linkedItem}>
											<span className={editorStyles.linkedItemName}>{p.name || "Пункт"}</span>
											<span className={editorStyles.linkedItemAddress}>{p.address}</span>
											{p.phones?.length > 0 && <span className={editorStyles.linkedItemMeta}>Тел.: {p.phones.join(", ")}</span>}
											{p.emails?.length > 0 && <span className={editorStyles.linkedItemMeta}>Почта: {p.emails.join(", ")}</span>}
											<Link href={`/admin/pickup-points/${p.id}/edit`} className={editorStyles.linkedItemEdit}>
												Редактировать
											</Link>
										</li>
									))}
								</ul>
							)}

							<Link href="/admin/pickup-points" className={editorStyles.sectionLink}>
								Управлять пунктами выдачи →
							</Link>
						</section>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
