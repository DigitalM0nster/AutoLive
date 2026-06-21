"use client";

import type { ContactAddressItem } from "@/app/api/contacts-content/route";
import PhoneInput from "@/components/ui/phoneInput/PhoneInput";
import { normalizePhoneDigits } from "@/lib/phoneUtils";
import formStyles from "@/components/admin/addressForm/AddressForm.module.scss";
import { handleCoordsPaste } from "@/components/admin/addressForm/addressFormTypes";
import editorStyles from "../ContactsEditor.module.scss";

type ContactAddressCardProps = {
	item: ContactAddressItem;
	index: number;
	onChange: (index: number, item: ContactAddressItem) => void;
	onRemove: (index: number) => void;
};

export default function ContactAddressCard({ item, index, onChange, onRemove }: ContactAddressCardProps) {
	const patch = (partial: Partial<ContactAddressItem>) => onChange(index, { ...item, ...partial });

	const updatePhone = (phoneIndex: number, value: string) => {
		const phones = [...(item.phones ?? [])];
		phones[phoneIndex] = value;
		patch({ phones });
	};

	const removePhone = (phoneIndex: number) => patch({ phones: (item.phones ?? []).filter((_, i) => i !== phoneIndex) });
	const addPhone = () => patch({ phones: [...(item.phones ?? []), ""] });

	const updateEmail = (emailIndex: number, value: string) => {
		const emails = [...(item.emails ?? [])];
		emails[emailIndex] = value;
		patch({ emails });
	};

	const removeEmail = (emailIndex: number) => patch({ emails: (item.emails ?? []).filter((_, i) => i !== emailIndex) });
	const addEmail = () => patch({ emails: [...(item.emails ?? []), ""] });

	return (
		<div className={editorStyles.addressCard}>
			<div className={editorStyles.addressCardHead}>
				<span className={editorStyles.addressCardIndex}>Точка #{index + 1}</span>
				<button type="button" className={editorStyles.removeAddressBtn} onClick={() => onRemove(index)}>
					Удалить
				</button>
			</div>

			<div className={formStyles.fieldGroup}>
				<label>Адрес</label>
				<textarea rows={2} value={item.address} onChange={(e) => patch({ address: e.target.value })} placeholder="г. Москва, ул. Примерная, д. 1" />
			</div>

			<div className={formStyles.fieldRow}>
				<div className={formStyles.fieldGroup}>
					<label>Широта</label>
					<input
						type="number"
						step="any"
						value={item.latitude ?? ""}
						onChange={(e) => {
							const v = e.target.value.trim();
							patch({ latitude: v === "" ? null : Number(v) });
						}}
						onPaste={(e) =>
							handleCoordsPaste(e, (lat, lng) =>
								patch({ latitude: lat === "" ? null : Number(lat), longitude: lng === "" ? null : Number(lng) })
							)
						}
						placeholder="55.75"
					/>
				</div>
				<div className={formStyles.fieldGroup}>
					<label>Долгота</label>
					<input
						type="number"
						step="any"
						value={item.longitude ?? ""}
						onChange={(e) => {
							const v = e.target.value.trim();
							patch({ longitude: v === "" ? null : Number(v) });
						}}
						onPaste={(e) =>
							handleCoordsPaste(e, (lat, lng) =>
								patch({ latitude: lat === "" ? null : Number(lat), longitude: lng === "" ? null : Number(lng) })
							)
						}
						placeholder="37.62"
					/>
				</div>
			</div>

			<div className={formStyles.fieldGroup}>
				<label>Режим работы</label>
				<input
					type="text"
					value={item.workingHours ?? ""}
					onChange={(e) => patch({ workingHours: e.target.value.trim() || null })}
					placeholder="Пн–Пт: 9:00–18:00"
				/>
			</div>

			<div className={formStyles.fieldRow}>
				<div className={formStyles.fieldGroup}>
					<span className={formStyles.subsectionLabel}>Телефоны</span>
					<div className={formStyles.listStack}>
						{(item.phones ?? []).map((phone, phoneIndex) => (
								<div key={phoneIndex} className={formStyles.listRow}>
									<PhoneInput
										value={normalizePhoneDigits(phone)}
										onValueChange={(raw) => updatePhone(phoneIndex, raw)}
										inputClassName={formStyles.listInput}
									/>
								<button type="button" className={formStyles.listRemoveBtn} onClick={() => removePhone(phoneIndex)} aria-label="Удалить телефон">
									×
								</button>
							</div>
						))}
					</div>
					<button type="button" className={formStyles.addListBtn} onClick={addPhone}>
						+ Телефон
					</button>
				</div>

				<div className={formStyles.fieldGroup}>
					<span className={formStyles.subsectionLabel}>Почта</span>
					<div className={formStyles.listStack}>
						{(item.emails ?? []).map((email, emailIndex) => (
							<div key={emailIndex} className={formStyles.listRow}>
								<input
									className={formStyles.listInput}
									type="email"
									value={email}
									onChange={(e) => updateEmail(emailIndex, e.target.value)}
									placeholder="info@example.com"
								/>
								<button type="button" className={formStyles.listRemoveBtn} onClick={() => removeEmail(emailIndex)} aria-label="Удалить почту">
									×
								</button>
							</div>
						))}
					</div>
					<button type="button" className={formStyles.addListBtn} onClick={addEmail}>
						+ Почта
					</button>
				</div>
			</div>
		</div>
	);
}
