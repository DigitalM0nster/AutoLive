import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import { getSiteLegalContent } from "@/lib/siteLegalContent";
import LegalDocumentViewer from "./LegalDocumentViewer";
import styles from "./legalPolicyPageContent.module.scss";
import shared from "../legal-shared.module.scss";

type Variant = "privacy" | "cookies";

const DEFAULT_HEADING: Record<Variant, string> = {
	privacy: "Политика в отношении персональных данных",
	cookies: "Политика использования файлов cookie",
};

/**
 * Содержимое /privacy и /cookies: заголовок и PDF из админки («Юридические документы»).
 */
export default async function LegalPolicyPageContent({ variant }: { variant: Variant }) {
	const data = await getSiteLegalContent();
	const fileUrl = variant === "privacy" ? data.privacyPolicyFileUrl : data.cookiesPolicyFileUrl;
	const customTitle = variant === "privacy" ? data.privacyPolicyTitle : data.cookiesPolicyTitle;
	const heading = (customTitle && customTitle.trim()) || DEFAULT_HEADING[variant];

	return (
		<div className={`screen ${shared.screen}`}>
			<div className="screenContent">
				<NavigationMenu />
				<div className={shared.inner}>
					<h1 className={shared.pageTitle}>{heading}</h1>

					{fileUrl ?
						<LegalDocumentViewer fileUrl={fileUrl} title={heading} panelId={variant} />
					:	<div className={styles.emptyBox}>
							<p className={shared.lead}>Файл политики ещё не размещён.</p>
						</div>
					}
				</div>
			</div>
		</div>
	);
}
