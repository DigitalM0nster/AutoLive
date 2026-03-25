import LegalPolicyPageContent from "../local_components/LegalPolicyPageContent";
import CONFIG from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: `Политика cookie | ${CONFIG.STORE_NAME}`,
	description: `Использование файлов cookie на сайте ${CONFIG.STORE_NAME}.`,
};

export default function CookiesPolicyPage() {
	return <LegalPolicyPageContent variant="cookies" />;
}
