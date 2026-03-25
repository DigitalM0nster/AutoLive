import Link from "next/link";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import { getSiteLegalContent } from "@/lib/siteLegalContent";
import { COOKIES_POLICY_PATH, PRIVACY_POLICY_PATH } from "@/lib/consentConstants";
import styles from "./legalPolicyPageContent.module.scss";
import shared from "../legal-shared.module.scss";

type Variant = "privacy" | "cookies";

const DEFAULT_HEADING: Record<Variant, string> = {
	privacy: "Политика в отношении персональных данных",
	cookies: "Политика использования файлов cookie",
};

const CROSS_LINK: Record<Variant, { href: string; label: string }> = {
	privacy: { href: COOKIES_POLICY_PATH, label: "политике использования cookie" },
	cookies: { href: PRIVACY_POLICY_PATH, label: "политике конфиденциальности и обработке персональных данных" },
};

/**
 * Содержимое /privacy и /cookies: заголовок и PDF из админки («Юридические документы»).
 */
export default async function LegalPolicyPageContent({ variant }: { variant: Variant }) {
	const data = await getSiteLegalContent();
	const fileUrl = variant === "privacy" ? data.privacyPolicyFileUrl : data.cookiesPolicyFileUrl;
	const customTitle = variant === "privacy" ? data.privacyPolicyTitle : data.cookiesPolicyTitle;
	const heading = (customTitle && customTitle.trim()) || DEFAULT_HEADING[variant];
	const cross = CROSS_LINK[variant];

	return (
		<div className={`screen ${shared.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={shared.inner}>
					<h1 className={shared.pageTitle}>{heading}</h1>

					{fileUrl ? (
						<>
							<p className={shared.lead}>Документ загружен в административной панели. Если просмотр не открылся в окне ниже, откройте файл по ссылке.</p>
							<div className={styles.toolbar}>
								<a className={styles.openLink} href={fileUrl} target="_blank" rel="noopener noreferrer">
									Открыть документ в новой вкладке
								</a>
							</div>
							<div className={styles.frameWrap}>
								<iframe className={styles.frame} src={fileUrl} title={heading} />
							</div>
						</>
					) : (
						<div className={styles.emptyBox}>
							<p className={shared.lead}>Файл политики ещё не размещён.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
