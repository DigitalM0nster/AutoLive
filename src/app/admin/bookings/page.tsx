// src/app/admin/bookings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Booking, BookingResponse, CreateBookingRequest } from "@/lib/types";

export default function BookingsPage() {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);

	// Состояние для формы создания записи
	const [createForm, setCreateForm] = useState<CreateBookingRequest>({
		scheduledDate: "",
		scheduledTime: "",
		managerId: 0,
		notes: "",
	});

	// Загружаем записи при монтировании компонента
	useEffect(() => {
		fetchBookings();
	}, []);

	// Функция для загрузки записей
	const fetchBookings = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/bookings");
			const data: BookingResponse = await response.json();

			if (data.error) {
				setError(data.error);
			} else {
				setBookings(data.bookings || []);
				setError(null);
			}
		} catch (err) {
			setError("Ошибка при загрузке записей");
			console.error("Ошибка:", err);
		} finally {
			setLoading(false);
		}
	};

	// Функция для создания новой записи
	const handleCreateBooking = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch("/api/bookings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(createForm),
			});

			const data: BookingResponse = await response.json();

			if (data.error) {
				setError(data.error);
			} else {
				// Обновляем список записей
				await fetchBookings();
				// Сбрасываем форму
				setCreateForm({
					scheduledDate: "",
					scheduledTime: "",
					managerId: 0,
					notes: "",
				});
				setShowCreateForm(false);
				setError(null);
			}
		} catch (err) {
			setError("Ошибка при создании записи");
			console.error("Ошибка:", err);
		}
	};

	// Функция для обновления статуса записи
	const handleUpdateStatus = async (id: number, newStatus: string) => {
		try {
			const response = await fetch(`/api/bookings/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: newStatus }),
			});

			const data: BookingResponse = await response.json();

			if (data.error) {
				setError(data.error);
			} else {
				// Обновляем список записей
				await fetchBookings();
				setError(null);
			}
		} catch (err) {
			setError("Ошибка при обновлении статуса");
			console.error("Ошибка:", err);
		}
	};

	// Функция для удаления записи
	const handleDeleteBooking = async (id: number) => {
		if (!confirm("Вы уверены, что хотите удалить эту запись?")) {
			return;
		}

		try {
			const response = await fetch(`/api/bookings/${id}`, {
				method: "DELETE",
			});

			if (response.ok) {
				// Обновляем список записей
				await fetchBookings();
				setError(null);
			} else {
				const data = await response.json();
				setError(data.error || "Ошибка при удалении записи");
			}
		} catch (err) {
			setError("Ошибка при удалении записи");
			console.error("Ошибка:", err);
		}
	};

	// Функция для форматирования даты
	const formatDate = (dateString: string | Date) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("ru-RU");
	};

	// Функция для получения названия статуса
	const getStatusName = (status: string) => {
		const statusNames: Record<string, string> = {
			scheduled: "Запланирована",
			confirmed: "Подтверждена",
			completed: "Выполнена",
			cancelled: "Отменена",
			no_show: "Не явился",
		};
		return statusNames[status] || status;
	};

	// Функция для получения цвета статуса
	const getStatusColor = (status: string) => {
		const statusColors: Record<string, string> = {
			scheduled: "#3b82f6", // синий
			confirmed: "#10b981", // зеленый
			completed: "#059669", // темно-зеленый
			cancelled: "#ef4444", // красный
			no_show: "#f59e0b", // оранжевый
		};
		return statusColors[status] || "#6b7280";
	};

	if (loading) {
		return (
			<div className="adminPage">
				<div className="adminPageHeader">
					<h1>Записи</h1>
				</div>
				<div className="adminPageContent">
					<p>Загрузка...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="adminPage">
			<div className="adminPageHeader">
				<h1>Записи</h1>
				<button onClick={() => setShowCreateForm(true)} className="primaryButton">
					Создать запись
				</button>
			</div>

			<div className="adminPageContent">
				{error && (
					<div className="errorMessage" style={{ marginBottom: "20px" }}>
						{error}
					</div>
				)}

				{/* Форма создания записи */}
				{showCreateForm && (
					<div className="createFormOverlay">
						<div className="createForm">
							<div className="createFormHeader">
								<h2>Создать новую запись</h2>
								<button onClick={() => setShowCreateForm(false)} className="closeButton">
									×
								</button>
							</div>

							<form onSubmit={handleCreateBooking}>
								<div className="formField">
									<label>Дата записи:</label>
									<input
										type="date"
										value={createForm.scheduledDate}
										onChange={(e) =>
											setCreateForm({
												...createForm,
												scheduledDate: e.target.value,
											})
										}
										required
									/>
								</div>

								<div className="formField">
									<label>Время записи:</label>
									<input
										type="time"
										value={createForm.scheduledTime}
										onChange={(e) =>
											setCreateForm({
												...createForm,
												scheduledTime: e.target.value,
											})
										}
										required
									/>
								</div>

								<div className="formField">
									<label>Менеджер (ID):</label>
									<input
										type="number"
										value={createForm.managerId || ""}
										onChange={(e) =>
											setCreateForm({
												...createForm,
												managerId: parseInt(e.target.value) || 0,
											})
										}
										required
									/>
								</div>

								<div className="formField">
									<label>Примечания:</label>
									<textarea
										value={createForm.notes || ""}
										onChange={(e) =>
											setCreateForm({
												...createForm,
												notes: e.target.value,
											})
										}
										rows={3}
									/>
								</div>

								<div className="formActions">
									<button type="submit" className="primaryButton">
										Создать запись
									</button>
									<button type="button" onClick={() => setShowCreateForm(false)} className="secondaryButton">
										Отмена
									</button>
								</div>
							</form>
						</div>
					</div>
				)}

				{/* Список записей */}
				<div className="bookingsList">
					{bookings.length === 0 ? (
						<p>Записей пока нет</p>
					) : (
						bookings.map((booking) => (
							<div key={booking.id} className="bookingCard">
								<div className="bookingCardHeader">
									<h3>
										Запись #{booking.id} - {formatDate(booking.scheduledDate)} {booking.scheduledTime}
									</h3>
									<span
										className="statusBadge"
										style={{
											backgroundColor: getStatusColor(booking.status),
											color: "white",
											padding: "4px 8px",
											borderRadius: "4px",
											fontSize: "12px",
										}}
									>
										{getStatusName(booking.status)}
									</span>
								</div>

								<div className="bookingCardContent">
									<p>
										<strong>Менеджер:</strong> {booking.manager.first_name} {booking.manager.last_name}
									</p>
									{booking.client ? (
										<p>
											<strong>Клиент:</strong> {booking.client.first_name} {booking.client.last_name} ({booking.client.phone})
										</p>
									) : (
										<p>
											<strong>Клиент:</strong> Не зарегистрирован
										</p>
									)}
									{booking.notes && (
										<p>
											<strong>Примечания:</strong> {booking.notes}
										</p>
									)}
								</div>

								<div className="bookingCardActions">
									<select value={booking.status} onChange={(e) => handleUpdateStatus(booking.id, e.target.value)} className="statusSelect">
										<option value="scheduled">Запланирована</option>
										<option value="confirmed">Подтверждена</option>
										<option value="completed">Выполнена</option>
										<option value="cancelled">Отменена</option>
										<option value="no_show">Не явился</option>
									</select>

									<button onClick={() => handleDeleteBooking(booking.id)} className="dangerButton" style={{ marginLeft: "10px" }}>
										Удалить
									</button>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
