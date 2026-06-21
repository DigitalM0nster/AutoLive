import Link from "next/link";
import RequestsSectionTabs from "../homepage-requests/local_components/RequestsSectionTabs";
import SiteFeedbackFormEditor from "./local_components/SiteFeedbackFormEditor";
import styles from "../content/local_components/styles.module.scss";
import editorStyles from "./SiteFeedbackFormEditor.module.scss";

export default function SiteFeedbackFormPage() {
	return (
		<div className="screenContent">
			<div className="tableContainer feedbackFormPage">
				<div className="tabsContainer column">
					<Link href="/admin/dashboard" className={styles.backToContentLink}>
						<span className={styles.backToContentLinkArrow} aria-hidden>
							←
						</span>
						На панель
					</Link>
				</div>
				<RequestsSectionTabs active="form" />
				<p className={editorStyles.tabsHint}>
					Настройка полей заявки с сайта. Заявки смотрите во вкладке «Заявки с сайта».
				</p>
				<div className={`tableContent contentComponent ${styles.contentComponent}`}>
					<SiteFeedbackFormEditor />
				</div>
			</div>
		</div>
	);
}
