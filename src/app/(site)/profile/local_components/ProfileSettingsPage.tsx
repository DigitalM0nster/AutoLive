"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { defaultFooterContentDisplay, type FooterContentData } from "@/lib/footerDisplay";
import styles from "./profileArea.module.scss";

type UserRow = {
	id: number;
	phone: string;
	role: string;
	status: string;
	first_name: string;
	last_name: string;
	middle_name: string;
};

export default function ProfileSettingsPage() {
	const { initAuth } = useAuthStore();
	const [profile, setProfile] = useState<UserRow | null>(null);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [middleName, setMiddleName] = useState("");
	const [profileDirty, setProfileDirty] = useState(false);
	const [savingProfile, setSavingProfile] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [savingPassword, setSavingPassword] = useState(false);

	const [footer, setFooter] = useState<FooterContentData | null>(null);
	const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

	const loadUser = useCallback(async () => {
		const res = await fetch("/api/user/get-user-data", { credentials: "include" });
		if (!res.ok) return;
		const u = (await res.json()) as UserRow;
		if (u.role !== "client") return;
		setProfile(u);
		setFirstName(u.first_name ?? "");
		setLastName(u.last_name ?? "");
		setMiddleName(u.middle_name ?? "");
		setProfileDirty(false);
	}, []);

	useEffect(() => {
		void loadUser();
	}, [loadUser]);

	useEffect(() => {
		if (!profile) return;
		const changed =
			firstName !== (profile.first_name ?? "") ||
			lastName !== (profile.last_name ?? "") ||
			middleName !== (profile.middle_name ?? "");
		setProfileDirty(changed);
	}, [firstName, lastName, middleName, profile]);

	useEffect(() => {
		let cancelled = false;
		fetch("/api/footer-content")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: FooterContentData | null) => {
				if (!cancelled && data) setFooter(data);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	const saveProfile = async () => {
		setSavingProfile(true);
		setBanner(null);
		try {
			const res = await fetch("/api/user/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					first_name: firstName,
					last_name: lastName,
					middle_name: middleName,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(typeof data.error === "string" ? data.error : "Ошибка сохранения");
			}
			await initAuth();
			setProfile((p) =>
				p ?
					{
						...p,
						first_name: data.first_name ?? firstName,
						last_name: data.last_name ?? lastName,
						middle_name: data.middle_name ?? middleName,
					}
				:	p
			);
			setProfileDirty(false);
			setBanner({ type: "ok", text: "Данные профиля сохранены." });
		} catch (e) {
			setBanner({ type: "err", text: e instanceof Error ? e.message : "Ошибка сохранения" });
		} finally {
			setSavingProfile(false);
		}
	};

	const savePassword = async () => {
		setBanner(null);
		if (newPassword !== confirmPassword) {
			setBanner({ type: "err", text: "Новый пароль и подтверждение не совпадают." });
			return;
		}
		if (newPassword.length < 8) {
			setBanner({ type: "err", text: "Новый пароль не короче 8 символов." });
			return;
		}
		setSavingPassword(true);
		try {
			const res = await fetch("/api/user/profile/password", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(typeof data.error === "string" ? data.error : "Не удалось сменить пароль");
			}
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setBanner({ type: "ok", text: "Пароль обновлён. Используйте его при следующем входе." });
		} catch (e) {
			setBanner({ type: "err", text: e instanceof Error ? e.message : "Ошибка" });
		} finally {
			setSavingPassword(false);
		}
	};

	if (!profile) {
		return <p className={styles.redirectNote}>Загрузка…</p>;
	}

	const effectiveFooter = footer ?? defaultFooterContentDisplay;
	const visibleDocs = (effectiveFooter.documents ?? []).filter((d) => d.title.trim() !== "" && d.fileUrl.trim() !== "");

	return (
		<>
			<h1 className={styles.pageTitle}>Профиль и безопасность</h1>
			{banner?.type === "ok" && <div className={styles.successBanner}>{banner.text}</div>}
			{banner?.type === "err" && <div className={styles.errorBanner}>{banner.text}</div>}

			<section className={styles.section}>
				<h2 className={styles.subTitle}>Контакты аккаунта</h2>
				<p className={styles.muted}>Телефон: {profile.phone} (логин, меняется только через поддержку магазина).</p>
			</section>

			<section className={styles.section}>
				<h2 className={styles.subTitle}>ФИО</h2>
				<p className={styles.muted}>Так вас увидят менеджеры в заказах и записях.</p>
				<div className={styles.card}>
					<div className={styles.formGrid}>
						<div className={styles.formField}>
							<label htmlFor="set-last">Фамилия</label>
							<input id="set-last" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
						</div>
						<div className={styles.formField}>
							<label htmlFor="set-first">Имя</label>
							<input id="set-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
						</div>
						<div className={styles.formField}>
							<label htmlFor="set-middle">Отчество</label>
							<input id="set-middle" value={middleName} onChange={(e) => setMiddleName(e.target.value)} autoComplete="additional-name" />
						</div>
					</div>
					<div className={styles.saveRow}>
						<button type="button" className={styles.saveButton} disabled={!profileDirty || savingProfile} onClick={() => void saveProfile()}>
							{savingProfile ? "Сохранение…" : "Сохранить ФИО"}
						</button>
					</div>
				</div>
			</section>

			<section className={styles.section}>
				<h2 className={styles.subTitle}>Пароль</h2>
				<p className={styles.muted}>Укажите текущий пароль и новый (не менее 8 символов).</p>
				<div className={styles.card}>
					<div className={styles.formGrid}>
						<div className={styles.formField}>
							<label htmlFor="pwd-current">Текущий пароль</label>
							<input
								id="pwd-current"
								type="password"
								autoComplete="current-password"
								value={currentPassword}
								onChange={(e) => setCurrentPassword(e.target.value)}
							/>
						</div>
						<div className={styles.formField}>
							<label htmlFor="pwd-new">Новый пароль</label>
							<input
								id="pwd-new"
								type="password"
								autoComplete="new-password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
							/>
						</div>
						<div className={styles.formField}>
							<label htmlFor="pwd-confirm">Повторите новый пароль</label>
							<input
								id="pwd-confirm"
								type="password"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
						</div>
					</div>
					<div className={styles.saveRow}>
						<button
							type="button"
							className={styles.saveButton}
							disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
							onClick={() => void savePassword()}
						>
							{savingPassword ? "Сохранение…" : "Сменить пароль"}
						</button>
					</div>
				</div>
			</section>

			<section className={styles.section}>
				<h2 className={styles.subTitle}>Документы</h2>
				<p className={styles.muted}>Те же файлы, что в подвале сайта (политика, оферта и т.д.).</p>
				{visibleDocs.length === 0 ?
					<div className={styles.emptyState}>Документы не настроены.</div>
				:	<div className={styles.card}>
						<div className={styles.documentsList}>
							{visibleDocs.map((d) => (
								<a key={d.id} className={styles.docLink} href={d.fileUrl} target="_blank" rel="noopener noreferrer">
									{d.title}
								</a>
							))}
						</div>
					</div>
				}
			</section>
		</>
	);
}
