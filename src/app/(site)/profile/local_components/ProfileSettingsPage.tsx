"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhoneDisplay } from "@/lib/phoneUtils";
import { useAuthStore } from "@/store/authStore";
import type { SiteLegalContentData } from "@/lib/siteLegalContent.shared";
import { defaultSiteLegalContent } from "@/lib/siteLegalContent.shared";
import { canAccessSiteProfile } from "@/lib/siteProfileAccess";
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

	const [legal, setLegal] = useState<SiteLegalContentData>(defaultSiteLegalContent);
	const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

	const loadUser = useCallback(async () => {
		const res = await fetch("/api/user/get-user-data", { credentials: "include" });
		if (!res.ok) return;
		const u = (await res.json()) as UserRow;
		if (!canAccessSiteProfile(u.role)) return;
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
		fetch("/api/legal-content")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: SiteLegalContentData | null) => {
				if (!cancelled && data) setLegal({ ...defaultSiteLegalContent, ...data });
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
		return <p className={styles.loadingNote}>Загрузка…</p>;
	}

	return (
		<>
			<header className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>Профиль и безопасность</h1>
				<p className={styles.pageLead}>Управляйте ФИО, паролем и просматривайте юридические документы сайта.</p>
			</header>

			{banner?.type === "ok" && <div className={styles.successBanner}>{banner.text}</div>}
			{banner?.type === "err" && <div className={styles.errorBanner}>{banner.text}</div>}

			<div className={styles.panelCard}>
				<h2 className={styles.panelTitle}>Контакты аккаунта</h2>
				<dl className={styles.factsList}>
					<dt>Телефон (логин)</dt>
					<dd>{formatPhoneDisplay(profile.phone)}</dd>
					<dt>Статус</dt>
					<dd>
						{profile.status === "verified" ?
							<span className={`${styles.statusBadge} ${styles.verified}`}>Подтверждён</span>
						:	<span className={`${styles.statusBadge} ${styles.pending}`}>Не подтверждён</span>}
					</dd>
				</dl>
				<p className={styles.panelHint}>Изменить номер телефона можно только через поддержку магазина.</p>
			</div>

			<section className={styles.section}>
				<div className={styles.panelCard}>
					<h2 className={styles.panelTitle}>ФИО</h2>
					<p className={styles.panelHint}>Так вас увидят менеджеры в заказах и записях.</p>
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
				<div className={styles.panelCard}>
					<h2 className={styles.panelTitle}>Пароль</h2>
					<p className={styles.panelHint}>Укажите текущий пароль и новый (не менее 8 символов).</p>
					<div className={styles.formGridSingleColumn}>
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
				<div className={styles.panelCard}>
					<h2 className={styles.panelTitle}>Юридические документы</h2>
					<p className={styles.panelHint}>Политики, размещённые администратором для страниц сайта.</p>
					{!legal.privacyPolicyFileUrl && !legal.cookiesPolicyFileUrl ?
						<p className={styles.muted}>Файлы политик ещё не загружены.</p>
					:	<div className={styles.documentsList}>
							{legal.privacyPolicyFileUrl && (
								<a className={styles.docLink} href={legal.privacyPolicyFileUrl} target="_blank" rel="noopener noreferrer">
									{legal.privacyPolicyTitle?.trim() || "Политика персональных данных"}
								</a>
							)}
							{legal.cookiesPolicyFileUrl && (
								<a className={styles.docLink} href={legal.cookiesPolicyFileUrl} target="_blank" rel="noopener noreferrer">
									{legal.cookiesPolicyTitle?.trim() || "Политика использования cookie"}
								</a>
							)}
						</div>
					}
				</div>
			</section>
		</>
	);
}
