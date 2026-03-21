"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../local_components/styles.module.scss";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";

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

	// Подтягиваем адреса для записей и пункты выдачи (для отображения на странице контактов)
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
			setInitialData(JSON.parse(JSON.stringify(savedData)));
			setHasChanges(false);
			alert("Данные успешно сохранены!");
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

	if (loading) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer column">
						<Link href="/admin/content" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							Редактор контента
						</Link>
						<div className="tabTitle">Контакты</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Загрузка...</div>
					</div>
				</div>
			</div>
		);
	}

	if (!data) {
		return (
			<div className="screenContent">
				<div className="tableContainer">
					<div className="tabsContainer column">
						<Link href="/admin/content" className={styles.backToContentLink}>
							<span className={styles.backToContentLinkArrow} aria-hidden>
								←
							</span>
							Редактор контента
						</Link>
						<div className="tabTitle">Контакты</div>
					</div>
					<div className="tableContent">
						<div className={styles.editorPlaceholder}>Ошибка загрузки данных</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="screenContent">
			<div className="tableContainer">
				<div className="tabsContainer column">
					<Link href="/admin/content" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						Редактор контента
					</Link>
					<div className="tabTitle">Контакты</div>
				</div>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<div className={`formFields ${styles.formFields}`}>
						{error && <div className={styles.errorBlock}>{error}</div>}

						{/* Контактные адреса (отображаются на карте всегда; у каждого — свои координаты, телефоны, почты, режим работы) */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Контактная информация (адреса на карте)</h3>
							<p className={styles.addressesSectionHint}>
								Можно добавить несколько адресов. У каждого — свой адрес, координаты, телефоны, почты и режим работы. Эти адреса всегда отображаются на карте на
								странице «Контакты».
							</p>
							{(data.contactAddresses ?? []).map((item, index) => (
								<div key={item.id ?? index} className={styles.contactAddressCard}>
									<div className="formRow">
										<div className={`formField ${styles.formField} fullWidth`}>
											<label>Адрес</label>
											<textarea
												rows={2}
												value={item.address}
												onChange={(e) => {
													const next = [...(data.contactAddresses ?? [])];
													next[index] = { ...next[index]!, address: e.target.value };
													setData({ ...data, contactAddresses: next });
												}}
												placeholder="г. Москва, ул. Примерная, д. 1"
											/>
										</div>
									</div>
									<div className="formRow">
										<div className={`formField ${styles.formField}`}>
											<label>Широта</label>
											<input
												type="number"
												step="any"
												value={item.latitude ?? ""}
												onChange={(e) => {
													const v = e.target.value.trim();
													const next = [...(data.contactAddresses ?? [])];
													next[index] = { ...next[index]!, latitude: v === "" ? null : Number(v) };
													setData({ ...data, contactAddresses: next });
												}}
												placeholder="55.75"
											/>
										</div>
										<div className={`formField ${styles.formField}`}>
											<label>Долгота</label>
											<input
												type="number"
												step="any"
												value={item.longitude ?? ""}
												onChange={(e) => {
													const v = e.target.value.trim();
													const next = [...(data.contactAddresses ?? [])];
													next[index] = { ...next[index]!, longitude: v === "" ? null : Number(v) };
													setData({ ...data, contactAddresses: next });
												}}
												placeholder="37.62"
											/>
										</div>
									</div>
									<div className="formRow">
										<div className={`formField ${styles.formField} fullWidth`}>
											<label>Режим работы</label>
											<input
												type="text"
												value={item.workingHours ?? ""}
												onChange={(e) => {
													const next = [...(data.contactAddresses ?? [])];
													next[index] = { ...next[index]!, workingHours: e.target.value.trim() || null };
													setData({ ...data, contactAddresses: next });
												}}
												placeholder="Пн–Пт: 9:00–18:00"
											/>
										</div>
									</div>
									<div className="formRow">
										<div className={`formField ${styles.formField}`}>
											<label>Телефоны</label>
											<div className="columnList">
												{(item.phones ?? []).map((phone, phoneIndex) => (
													<div key={phoneIndex} className="rowBlock phoneRowBlock">
														<input
															className="little"
															type="tel"
															value={phone}
															onChange={(e) => {
																const next = [...(data.contactAddresses ?? [])];
																const phones = [...(next[index]?.phones ?? [])];
																phones[phoneIndex] = e.target.value;
																next[index] = { ...next[index]!, phones };
																setData({ ...data, contactAddresses: next });
															}}
															placeholder="+7 (999) 123-45-67"
														/>
														<button
															type="button"
															className={`button ${styles.removeButton} ${styles.button}`}
															onClick={() => {
																const next = [...(data.contactAddresses ?? [])];
																const phones = [...(next[index]?.phones ?? [])].filter((_, i) => i !== phoneIndex);
																next[index] = { ...next[index]!, phones };
																setData({ ...data, contactAddresses: next });
															}}
														>
															Удалить
														</button>
													</div>
												))}
											</div>
											<button
												type="button"
												className={`button ${styles.addButton} ${styles.button}`}
												onClick={() => {
													const next = [...(data.contactAddresses ?? [])];
													const phones = [...(next[index]?.phones ?? []), ""];
													next[index] = { ...next[index]!, phones };
													setData({ ...data, contactAddresses: next });
												}}
											>
												+ Добавить телефон
											</button>
										</div>

										<div className={`formField ${styles.formField}`}>
											<label>Почты</label>
											<div className="columnList">
												{(item.emails ?? []).map((email, emailIndex) => (
													<div key={emailIndex} className="rowBlock phoneRowBlock">
														<input
															className="little"
															type="email"
															value={email}
															onChange={(e) => {
																const next = [...(data.contactAddresses ?? [])];
																const emails = [...(next[index]?.emails ?? [])];
																emails[emailIndex] = e.target.value;
																next[index] = { ...next[index]!, emails };
																setData({ ...data, contactAddresses: next });
															}}
															placeholder="info@example.com"
														/>
														<button
															type="button"
															className={`button ${styles.removeButton} ${styles.button}`}
															onClick={() => {
																const next = [...(data.contactAddresses ?? [])];
																const emails = [...(next[index]?.emails ?? [])].filter((_, i) => i !== emailIndex);
																next[index] = { ...next[index]!, emails };
																setData({ ...data, contactAddresses: next });
															}}
														>
															Удалить
														</button>
													</div>
												))}
											</div>
											<button
												type="button"
												className={`button ${styles.addButton} ${styles.button}`}
												onClick={() => {
													const next = [...(data.contactAddresses ?? [])];
													const emails = [...(next[index]?.emails ?? []), ""];
													next[index] = { ...next[index]!, emails };
													setData({ ...data, contactAddresses: next });
												}}
											>
												+ Добавить почту
											</button>
										</div>
									</div>
									<button
										type="button"
										className={`removeButton ${styles.removeAdressButton} ${styles.button}`}
										onClick={() => setData({ ...data, contactAddresses: (data.contactAddresses ?? []).filter((_, i) => i !== index) })}
									>
										Удалить адрес
									</button>
								</div>
							))}
							<button
								type="button"
								className="button"
								onClick={() =>
									setData({
										...data,
										contactAddresses: [
											...(data.contactAddresses ?? []),
											{
												address: "",
												latitude: null,
												longitude: null,
												phones: [],
												emails: [],
												workingHours: null,
												sortOrder: (data.contactAddresses ?? []).length,
											},
										],
									})
								}
							>
								+ Добавить адрес
							</button>
						</div>

						{/* Карта и примечание */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Карта и примечание</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="contacts-mapMarkerColor">Цвет меток на карте</label>
								<div className={styles.colorInputRow}>
									<input
										id="contacts-mapMarkerColor"
										type="color"
										value={data.mapMarkerColor && /^#[0-9A-Fa-f]{6}$/.test(data.mapMarkerColor) ? data.mapMarkerColor : "#2c5aa0"}
										onChange={(e) => setData({ ...data, mapMarkerColor: e.target.value })}
										className={styles.colorPicker}
									/>
									<input
										type="text"
										value={data.mapMarkerColor ?? ""}
										onChange={(e) => setData({ ...data, mapMarkerColor: e.target.value })}
										placeholder="#2c5aa0"
										className={styles.colorHexInput}
									/>
								</div>
								<p className={styles.colorHint}>Задаёт цвет точек на карте на странице контактов. Формат: #rrggbb.</p>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="contacts-mapZoom">Масштаб карты</label>
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
									placeholder="Авто (1 точка: 14, несколько: 12)"
									className={styles.zoomInput}
								/>
								<p className={styles.colorHint}>Число от 1 до 19. Пусто — подбирается автоматически.</p>
							</div>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="contacts-mapNote">Примечание к карте</label>
								<input
									id="contacts-mapNote"
									type="text"
									value={data.mapNote}
									onChange={(e) => setData({ ...data, mapNote: e.target.value })}
									placeholder="Текст-подсказка к карте на странице контактов"
								/>
							</div>
						</div>

						{/* Адреса для записей — подтягиваются из раздела «Адреса для записей» */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Адреса для записей</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="contacts-addressesBlockTitle">Название блока на странице контактов</label>
								<input
									id="contacts-addressesBlockTitle"
									type="text"
									value={data.addressesBlockTitle ?? ""}
									onChange={(e) => setData({ ...data, addressesBlockTitle: e.target.value })}
									placeholder="Например: Адреса для записей"
								/>
							</div>
							<p className={styles.addressesSectionHint}>
								Эти адреса отображаются на странице контактов и используются при записи на услуги. Редактирование — в отдельном разделе.
							</p>
							{bookingDepartments.length === 0 ? (
								<p className={styles.addressesSectionEmpty}>Нет добавленных адресов</p>
							) : (
								<ul className={styles.addressesList}>
									{bookingDepartments.map((d) => (
										<li key={d.id} className={styles.addressesListItem}>
											<span className={styles.addressesListName}>{d.name || "Адрес"}</span>
											<span className={styles.addressesListAddress}>{d.address}</span>
											{d.phones?.length > 0 && <span className={styles.addressesListExtra}>Телефоны: {d.phones.join(", ")}</span>}
											{d.emails?.length > 0 && <span className={styles.addressesListExtra}>Почта: {d.emails.join(", ")}</span>}
											<Link href={`/admin/booking-departments/${d.id}/edit`} className={styles.addressesListEdit}>
												Редактировать
											</Link>
										</li>
									))}
								</ul>
							)}
							<Link href="/admin/booking-departments" className={styles.addressesSectionLink}>
								Управлять адресами для записей →
							</Link>
						</div>

						{/* Пункты выдачи — подтягиваются из раздела «Пункты выдачи» */}
						<div className="formSection borderBlock">
							<h3 className="formSectionTitle">Пункты выдачи</h3>
							<div className={`formField ${styles.formField}`}>
								<label htmlFor="contacts-pickupBlockTitle">Название блока на странице контактов</label>
								<input
									id="contacts-pickupBlockTitle"
									type="text"
									value={data.pickupBlockTitle ?? ""}
									onChange={(e) => setData({ ...data, pickupBlockTitle: e.target.value })}
									placeholder="Например: Пункты выдачи"
								/>
							</div>
							<p className={styles.addressesSectionHint}>Пункты выдачи отображаются на странице контактов. Редактирование — в отдельном разделе.</p>
							{pickupPoints.length === 0 ? (
								<p className={styles.addressesSectionEmpty}>Нет добавленных пунктов выдачи</p>
							) : (
								<ul className={styles.addressesList}>
									{pickupPoints.map((p) => (
										<li key={p.id} className={styles.addressesListItem}>
											<span className={styles.addressesListName}>{p.name || "Пункт"}</span>
											<span className={styles.addressesListAddress}>{p.address}</span>
											{p.phones?.length > 0 && <span className={styles.addressesListExtra}>Телефоны: {p.phones.join(", ")}</span>}
											{p.emails?.length > 0 && <span className={styles.addressesListExtra}>Почта: {p.emails.join(", ")}</span>}
											<Link href={`/admin/pickup-points/${p.id}/edit`} className={styles.addressesListEdit}>
												Редактировать
											</Link>
										</li>
									))}
								</ul>
							)}
							<Link href="/admin/pickup-points" className={styles.addressesSectionLink}>
								Управлять пунктами выдачи →
							</Link>
						</div>
					</div>
				</div>
			</div>

			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText="Сохранить изменения" />}
		</div>
	);
}
