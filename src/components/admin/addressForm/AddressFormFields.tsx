"use client";

import styles from "./AddressForm.module.scss";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import { normalizePhoneDigits } from "@/lib/phoneUtils";
import { handleCoordsPaste, type AddressFormData } from "./addressFormTypes";

type AddressFormFieldsProps = {
	value: AddressFormData;
	onChange: (value: AddressFormData) => void;
	idPrefix?: string;
};

export default function AddressFormFields({ value, onChange, idPrefix = "address" }: AddressFormFieldsProps) {
	const patch = (partial: Partial<AddressFormData>) => onChange({ ...value, ...partial });

	const setCoords = (latitude: string, longitude: string) => patch({ latitude, longitude });

	const updatePhone = (index: number, phone: string) => {
		const phones = [...value.phones];
		phones[index] = phone;
		patch({ phones });
	};

	const removePhone = (index: number) => patch({ phones: value.phones.filter((_, i) => i !== index) });

	const updateEmail = (index: number, email: string) => {
		const emails = [...value.emails];
		emails[index] = email;
		patch({ emails });
	};

	const removeEmail = (index: number) => patch({ emails: value.emails.filter((_, i) => i !== index) });

	return (
		<div className={styles.addressFormWrap}>
			<div className="formFields">
				{/* Основное */}
				<section className={styles.sectionCard}>
					<h3 className={styles.sectionTitle}>Основное</h3>

					<div className={styles.fieldGroup}>
						<label htmlFor={`${idPrefix}-name`}>Название</label>
						<input
							id={`${idPrefix}-name`}
							type="text"
							value={value.name}
							onChange={(e) => patch({ name: e.target.value })}
							placeholder="Краткое описание, необязательно"
						/>
						<p className={styles.fieldHint}>Помогает отличить адрес в списках админки и на сайте.</p>
					</div>

					<div className={styles.fieldGroup}>
						<label htmlFor={`${idPrefix}-address`}>
							Адрес <span className={styles.requiredMark}>*</span>
						</label>
						<textarea
							id={`${idPrefix}-address`}
							rows={2}
							value={value.address}
							onChange={(e) => patch({ address: e.target.value })}
							placeholder="г. Москва, ул. Примерная, д. 1"
							required
						/>
					</div>

					<label className={styles.toggleCard}>
						<input type="checkbox" checked={value.showOnContactsPage} onChange={(e) => patch({ showOnContactsPage: e.target.checked })} />
						<span className={styles.toggleText}>
							<strong>Показывать на странице «Контакты» и на карте</strong>
							<span className={styles.fieldHint}>Если выключить — адрес останется в админке, но не появится на сайте.</span>
						</span>
					</label>
				</section>

				{/* Карта и режим работы */}
				<section className={styles.sectionCard}>
					<h3 className={styles.sectionTitle}>На карте</h3>
					<p className={styles.fieldHint}>Координаты для метки на странице «Контакты». Можно вставить пару «широта, долгота» из Яндекс.Карт.</p>

					<div className={styles.fieldRow}>
						<div className={styles.fieldGroup}>
							<label htmlFor={`${idPrefix}-lat`}>Широта</label>
							<input
								id={`${idPrefix}-lat`}
								type="number"
								step="any"
								value={value.latitude}
								onChange={(e) => patch({ latitude: e.target.value })}
								onPaste={(e) => handleCoordsPaste(e, (lat, lng) => setCoords(lat, lng))}
								placeholder="55.75"
							/>
						</div>
						<div className={styles.fieldGroup}>
							<label htmlFor={`${idPrefix}-lng`}>Долгота</label>
							<input
								id={`${idPrefix}-lng`}
								type="number"
								step="any"
								value={value.longitude}
								onChange={(e) => patch({ longitude: e.target.value })}
								onPaste={(e) => handleCoordsPaste(e, (lat, lng) => setCoords(lat, lng))}
								placeholder="37.62"
							/>
						</div>
					</div>

					<div className={styles.fieldGroup}>
						<label htmlFor={`${idPrefix}-hours`}>Режим работы</label>
						<input
							id={`${idPrefix}-hours`}
							type="text"
							value={value.workingHours}
							onChange={(e) => patch({ workingHours: e.target.value })}
							placeholder="Пн–Пт: 9:00–18:00"
						/>
					</div>
				</section>

				{/* Контакты */}
				<section className={styles.sectionCard}>
					<h3 className={styles.sectionTitle}>Контакты</h3>

					<div className={styles.fieldRow}>
						<div className={styles.fieldGroup}>
							<span className={styles.subsectionLabel}>Телефоны</span>
							<div className={styles.listStack}>
								{value.phones.map((phone, index) => (
									<div key={index} className={styles.listRow}>
										<PhoneInput
											value={normalizePhoneDigits(phone)}
											onValueChange={(raw) => updatePhone(index, raw)}
											inputClassName={styles.listInput}
										/>
										<button type="button" className={styles.listRemoveBtn} onClick={() => removePhone(index)} aria-label="Удалить телефон">
											×
										</button>
									</div>
								))}
							</div>
							<button type="button" className={styles.addListBtn} onClick={() => patch({ phones: [...value.phones, ""] })}>
								+ Телефон
							</button>
						</div>

						<div className={styles.fieldGroup}>
							<span className={styles.subsectionLabel}>Почта</span>
							<div className={styles.listStack}>
								{value.emails.map((email, index) => (
									<div key={index} className={styles.listRow}>
										<input
											className={styles.listInput}
											type="email"
											value={email}
											onChange={(e) => updateEmail(index, e.target.value)}
											placeholder="info@example.com"
										/>
										<button type="button" className={styles.listRemoveBtn} onClick={() => removeEmail(index)} aria-label="Удалить почту">
											×
										</button>
									</div>
								))}
							</div>
							<button type="button" className={styles.addListBtn} onClick={() => patch({ emails: [...value.emails, ""] })}>
								+ Почта
							</button>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}

export type { AddressFormData };
