"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PickupPoint } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import AddressFormFields, { type AddressFormData } from "@/components/admin/addressForm/AddressFormFields";

type Props = {
	isCreating?: boolean;
	pickupPointId?: number;
	initialData?: PickupPoint;
};

function toFormData(data?: PickupPoint | null): AddressFormData {
	return {
		name: data?.name || "",
		address: data?.address || "",
		phones: data?.phones || [],
		emails: data?.emails || [],
		workingHours: (data as PickupPoint & { workingHours?: string })?.workingHours ?? "",
		showOnContactsPage: (data as PickupPoint & { showOnContactsPage?: boolean })?.showOnContactsPage !== false,
		latitude: data?.latitude != null ? String(data.latitude) : "",
		longitude: data?.longitude != null ? String(data.longitude) : "",
	};
}

export default function PickupPointFormComponent({ isCreating = true, pickupPointId, initialData }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(!isCreating && !initialData);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [formData, setFormData] = useState<AddressFormData>(() => toFormData(initialData));
	const [initialFormData, setInitialFormData] = useState<AddressFormData>(() => toFormData(initialData));

	useEffect(() => {
		if (!isCreating && pickupPointId && !initialData) {
			const fetchData = async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/pickup-points/${pickupPointId}`, { credentials: "include" });
					if (!res.ok) throw new Error("Ошибка загрузки");
					const data = await res.json();
					const loaded = toFormData(data);
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
			setInitialFormData(toFormData(initialData));
		}
	}, [isCreating, pickupPointId, initialData]);

	useEffect(() => {
		if (isCreating) {
			setHasChanges(true);
			return;
		}
		setHasChanges(JSON.stringify(formData) !== JSON.stringify(initialFormData));
	}, [formData, initialFormData, isCreating]);

	const handleSave = async () => {
		if (!formData.address.trim()) {
			showErrorToast("Адрес обязателен");
			return;
		}

		const body = {
			name: formData.name.trim() || null,
			address: formData.address.trim(),
			phones: formData.phones.filter((s) => s.trim() !== ""),
			emails: formData.emails.filter((s) => s.trim() !== ""),
			workingHours: formData.workingHours.trim() || null,
			showOnContactsPage: formData.showOnContactsPage,
			latitude: formData.latitude === "" ? null : Number(formData.latitude),
			longitude: formData.longitude === "" ? null : Number(formData.longitude),
		};

		setSaving(true);
		try {
			const res = await fetch(isCreating ? "/api/pickup-points" : `/api/pickup-points/${pickupPointId}`, {
				method: isCreating ? "POST" : "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Ошибка сохранения");
			}
			showSuccessToast(isCreating ? "Пункт выдачи создан" : "Пункт выдачи обновлён");
			setHasChanges(false);
			router.push("/admin/pickup-points");
		} catch (e: unknown) {
			showErrorToast(e instanceof Error ? e.message : "Ошибка сохранения");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!isCreating) {
			setFormData({ ...initialFormData });
			setHasChanges(false);
		} else {
			router.push("/admin/pickup-points");
		}
	};

	if (loading) return <Loading />;

	return (
		<>
			<AddressFormFields value={formData} onChange={setFormData} idPrefix="pickup" />
			{hasChanges && (
				<FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText={isCreating ? "Создать пункт выдачи" : "Сохранить"} />
			)}
		</>
	);
}
