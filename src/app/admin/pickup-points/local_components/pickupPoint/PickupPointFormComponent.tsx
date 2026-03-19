"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PickupPoint } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";

type Props = {
	isCreating?: boolean;
	pickupPointId?: number;
	initialData?: PickupPoint;
};

export default function PickupPointFormComponent({ isCreating = true, pickupPointId, initialData }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(!isCreating && !initialData);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [formData, setFormData] = useState({
		name: initialData?.name || "",
		address: initialData?.address || "",
		phones: initialData?.phones || [],
		emails: initialData?.emails || [],
		workingHours: (initialData as any)?.workingHours ?? "",
		showOnContactsPage: (initialData as any)?.showOnContactsPage !== false,
		latitude: initialData?.latitude != null ? String(initialData.latitude) : "",
		longitude: initialData?.longitude != null ? String(initialData.longitude) : "",
	});
	const [initialFormData, setInitialFormData] = useState({
		name: initialData?.name || "",
		address: initialData?.address || "",
		phones: initialData?.phones || [],
		emails: initialData?.emails || [],
		workingHours: (initialData as any)?.workingHours ?? "",
		showOnContactsPage: (initialData as any)?.showOnContactsPage !== false,
		latitude: initialData?.latitude != null ? String(initialData.latitude) : "",
		longitude: initialData?.longitude != null ? String(initialData.longitude) : "",
	});

	useEffect(() => {
		if (!isCreating && pickupPointId && !initialData) {
			const fetchData = async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/pickup-points/${pickupPointId}`, { credentials: "include" });
					if (!res.ok) throw new Error("Ошибка загрузки");
					const data = await res.json();
					const loaded = {
						name: data.name || "",
						address: data.address || "",
						phones: data.phones || [],
						emails: data.emails || [],
						workingHours: data.workingHours ?? "",
						showOnContactsPage: data.showOnContactsPage !== false,
						latitude: data.latitude != null ? String(data.latitude) : "",
						longitude: data.longitude != null ? String(data.longitude) : "",
					};
					setFormData(loaded);
					setInitialFormData(loaded);
				} catch {
					showErrorToast("Ошибка загрузки пункта выдачи");
				} finally {
					setLoading(false);
				}
			};
			fetchData();
		} else if (initialData) {
			setInitialFormData({
				name: initialData.name || "",
				address: initialData.address || "",
				phones: initialData.phones || [],
				emails: initialData.emails || [],
				workingHours: (initialData as any).workingHours ?? "",
				showOnContactsPage: (initialData as any).showOnContactsPage !== false,
				latitude: initialData.latitude != null ? String(initialData.latitude) : "",
				longitude: initialData.longitude != null ? String(initialData.longitude) : "",
			});
		}
	}, [isCreating, pickupPointId, initialData]);

	useEffect(() => {
		if (isCreating) {
			setHasChanges(true);
			return;
		}
		const changed =
			formData.name !== initialFormData.name ||
			formData.address !== initialFormData.address ||
			JSON.stringify(formData.phones) !== JSON.stringify(initialFormData.phones) ||
			JSON.stringify(formData.emails) !== JSON.stringify(initialFormData.emails) ||
			formData.workingHours !== initialFormData.workingHours ||
			formData.showOnContactsPage !== initialFormData.showOnContactsPage ||
			formData.latitude !== initialFormData.latitude ||
			formData.longitude !== initialFormData.longitude;
		setHasChanges(changed);
	}, [formData, initialFormData, isCreating]);

	const handleAddPhone = () => setFormData({ ...formData, phones: [...formData.phones, ""] });
	const handleRemovePhone = (i: number) => setFormData({ ...formData, phones: formData.phones.filter((_, idx) => idx !== i) });
	const handlePhoneChange = (i: number, v: string) => {
		const next = [...formData.phones];
		next[i] = v;
		setFormData({ ...formData, phones: next });
	};
	const handleAddEmail = () => setFormData({ ...formData, emails: [...formData.emails, ""] });
	const handleRemoveEmail = (i: number) => setFormData({ ...formData, emails: formData.emails.filter((_, idx) => idx !== i) });
	const handleEmailChange = (i: number, v: string) => {
		const next = [...formData.emails];
		next[i] = v;
		setFormData({ ...formData, emails: next });
	};

	const handleSave = async () => {
		if (!formData.address.trim()) {
			showErrorToast("Адрес обязателен");
			return;
		}
		const phones = formData.phones.filter((s) => s.trim() !== "");
		const emails = formData.emails.filter((s) => s.trim() !== "");
		setSaving(true);
		try {
			const body = {
				name: formData.name.trim() || null,
				address: formData.address.trim(),
				phones,
				emails,
				workingHours: formData.workingHours.trim() || null,
				showOnContactsPage: formData.showOnContactsPage,
				latitude: formData.latitude === "" ? null : Number(formData.latitude),
				longitude: formData.longitude === "" ? null : Number(formData.longitude),
			};
			const url = isCreating ? "/api/pickup-points" : `/api/pickup-points/${pickupPointId}`;
			const method = isCreating ? "POST" : "PUT";
			const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Ошибка сохранения");
			}
			showSuccessToast(isCreating ? "Пункт выдачи создан" : "Пункт выдачи обновлён");
			setHasChanges(false);
			router.push("/admin/pickup-points");
		} catch (e: any) {
			showErrorToast(e.message || "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!isCreating && initialFormData) {
			setFormData({ ...initialFormData });
			setHasChanges(false);
		} else {
			router.push("/admin/pickup-points");
		}
	};

	if (loading) return <Loading />;

	return (
		<>
			<div className="formFields">
				<div className="formField">
					<label htmlFor="pickup-name">Название (описание)</label>
					<input
						id="pickup-name"
						type="text"
						value={formData.name}
						onChange={(e) => setFormData({ ...formData, name: e.target.value })}
						placeholder="Введите название (необязательно)"
					/>
				</div>
				<div className="formField">
					<label htmlFor="pickup-address">Адрес *</label>
					<textarea
						id="pickup-address"
						value={formData.address}
						onChange={(e) => setFormData({ ...formData, address: e.target.value })}
						placeholder="Введите адрес"
						rows={3}
						required
					/>
				</div>
				{/* Можно вставить из буфера формат «широта, долгота» (как копируется в Яндексе) */}
				<div className="formField">
					<label>Координаты на карте (широта / долгота)</label>
					<div className="rowBlock" style={{ gap: 12, flexWrap: "wrap" }}>
						<input
							type="number"
							step="any"
							value={formData.latitude}
							onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
							onPaste={(e) => {
								const text = (e.clipboardData?.getData("text") ?? "").trim();
								const match = text.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
								if (match) {
									e.preventDefault();
									setFormData((prev) => ({ ...prev, latitude: match[1]!, longitude: match[2]! }));
								}
							}}
							placeholder="Широта или вставьте «широта, долгота»"
						/>
						<input
							type="number"
							step="any"
							value={formData.longitude}
							onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
							onPaste={(e) => {
								const text = (e.clipboardData?.getData("text") ?? "").trim();
								const match = text.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
								if (match) {
									e.preventDefault();
									setFormData((prev) => ({ ...prev, latitude: match[1]!, longitude: match[2]! }));
								}
							}}
							placeholder="Долгота"
						/>
					</div>
				</div>
				<div className="formField">
					<label>Телефоны</label>
					<div className="column" style={{ gap: 12 }}>
						{formData.phones.map((phone, i) => (
							<div key={i} className="rowBlock">
								<input type="tel" value={phone} onChange={(e) => handlePhoneChange(i, e.target.value)} placeholder="+7(999)123-45-67" className="formField" style={{ flex: 1 }} />
								<button type="button" onClick={() => handleRemovePhone(i)} className="removeButton">
									Удалить
								</button>
							</div>
						))}
						<button type="button" onClick={handleAddPhone} className="button">
							+ Добавить телефон
						</button>
					</div>
				</div>
				<div className="formField">
					<label>Почты</label>
					<div className="column" style={{ gap: 12 }}>
						{formData.emails.map((email, i) => (
							<div key={i} className="rowBlock">
								<input type="email" value={email} onChange={(e) => handleEmailChange(i, e.target.value)} placeholder="example@mail.com" className="formField" style={{ flex: 1 }} />
								<button type="button" onClick={() => handleRemoveEmail(i)} className="removeButton">
									Удалить
								</button>
							</div>
						))}
						<button type="button" onClick={handleAddEmail} className="button">
							+ Добавить почту
						</button>
					</div>
				</div>
				<div className="formField">
					<label htmlFor="pickup-workingHours">Режим работы</label>
					<input
						id="pickup-workingHours"
						type="text"
						value={formData.workingHours}
						onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
						placeholder="Пн–Пт: 9:00–18:00, Сб–Вс: выходной"
					/>
					<p style={{ marginTop: 4, fontSize: 12, color: "var(--grey-color)" }}>Отображается на странице «Контакты» с иконкой часов.</p>
				</div>
				<div className="formField">
					<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<input
							type="checkbox"
							checked={formData.showOnContactsPage}
							onChange={(e) => setFormData({ ...formData, showOnContactsPage: e.target.checked })}
						/>
						Отображать на странице «Контакты» и на карте
					</label>
					<p style={{ marginTop: 4, fontSize: 12, color: "var(--grey-color)" }}>Если снять галочку, пункт не будет показан на странице контактов и на карте.</p>
				</div>
			</div>
			{hasChanges && <FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText={isCreating ? "Создать пункт выдачи" : "Сохранить"} />}
		</>
	);
}
