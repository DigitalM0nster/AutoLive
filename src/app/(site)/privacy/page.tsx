import LegalPolicyPageContent from "../local_components/LegalPolicyPageContent";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: `Политика и персональные данные | ${CONFIG.STORE_NAME}`,
	description: `Политика конфиденциальности и обработка персональных данных на сайте ${CONFIG.STORE_NAME}.`,
};

export default function PrivacyPage() {
	return <LegalPolicyPageContent variant="privacy" />;
}
