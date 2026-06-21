"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingDepartment } from "@/lib/types";
import { showSuccessToast, showErrorToast } from "@/components/ui/toast/ToastProvider";
import Loading from "@/components/ui/loading/Loading";
import FixedActionButtons from "@/components/ui/fixedActionButtons/FixedActionButtons";
import AddressFormFields, { type AddressFormData } from "@/components/admin/addressForm/AddressFormFields";

type BookingDepartmentFormComponentProps = {
	isCreating?: boolean;
	bookingDepartmentId?: number;
	userRole?: string;
	initialData?: BookingDepartment;
};

function toFormData(data?: BookingDepartment | null): AddressFormData {
	return {
		name: data?.name || "",
		address: data?.address || "",
		phones: data?.phones || [],
		emails: data?.emails || [],
		workingHours: (data as BookingDepartment & { workingHours?: string })?.workingHours ?? "",
		showOnContactsPage: (data as BookingDepartment & { showOnContactsPage?: boolean })?.showOnContactsPage !== false,
		latitude: data?.latitude != null ? String(data.latitude) : "",
		longitude: data?.longitude != null ? String(data.longitude) : "",
	};
}

export default function BookingDepartmentFormComponent({ isCreating = true, bookingDepartmentId, initialData }: BookingDepartmentFormComponentProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(!isCreating && !initialData);
	const [saving, setSaving] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);
	const [formData, setFormData] = useState<AddressFormData>(() => toFormData(initialData));
	const [initialFormData, setInitialFormData] = useState<AddressFormData>(() => toFormData(initialData));

	useEffect(() => {
		if (!isCreating && bookingDepartmentId && !initialData) {
			const fetchBookingDepartment = async () => {
				setLoading(true);
				try {
					const res = await fetch(`/api/booking-departments/${bookingDepartmentId}`, { credentials: "include" });
					if (!res.ok) throw new Error("Ошибка загрузки адреса");
					const data = await res.json();
					const loaded = toFormData(data);
					setFormData(loaded);
					setInitialFormData(loaded);
				} catch (err) {
					console.error("Ошибка загрузки адреса:", err);
					showErrorToast("Ошибка загрузки адреса");
				} finally {
					setLoading(false);
				}
			};
			fetchBookingDepartment();
		} else if (initialData) {
			const loaded = toFormData(initialData);
			setInitialFormData(loaded);
		}
	}, [isCreating, bookingDepartmentId, initialData]);

	useEffect(() => {
		if (isCreating) {
			setHasChanges(true);
			return;
		}
		setHasChanges(JSON.stringify(formData) !== JSON.stringify(initialFormData));
	}, [formData, initialFormData, isCreating]);

	const handleSave = async () => {
		if (!formData.address.trim()) {
			showErrorToast("Адрес обязателен для заполнения");
			return;
		}

		const requestData = {
			name: formData.name.trim() || null,
			address: formData.address.trim(),
			phones: formData.phones.filter((phone) => phone.trim() !== ""),
			emails: formData.emails.filter((email) => email.trim() !== ""),
			workingHours: formData.workingHours.trim() || null,
			showOnContactsPage: formData.showOnContactsPage,
			latitude: formData.latitude === "" ? null : Number(formData.latitude),
			longitude: formData.longitude === "" ? null : Number(formData.longitude),
		};

		setSaving(true);
		try {
			const response = await fetch(isCreating ? "/api/booking-departments" : `/api/booking-departments/${bookingDepartmentId}`, {
				method: isCreating ? "POST" : "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Ошибка при сохранении адреса");
			}

			showSuccessToast(isCreating ? "Адрес успешно создан" : "Адрес успешно обновлён");
			setHasChanges(false);
			router.push("/admin/booking-departments");
		} catch (err: unknown) {
			console.error("Ошибка при сохранении адреса:", err);
			showErrorToast(err instanceof Error ? err.message : "Ошибка при сохранении адреса");
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (!isCreating) {
			setFormData({ ...initialFormData });
			setHasChanges(false);
		} else {
			router.push("/admin/booking-departments");
		}
	};

	if (loading) return <Loading />;

	return (
		<>
			<AddressFormFields value={formData} onChange={setFormData} idPrefix="booking" />
			{hasChanges && (
				<FixedActionButtons onCancel={handleCancel} onSave={handleSave} isSaving={saving} saveText={isCreating ? "Создать адрес" : "Сохранить"} />
			)}
		</>
	);
}
