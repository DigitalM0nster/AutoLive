import CONFIG from "@/lib/config";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProfileShell from "./local_components/ProfileShell";

export const metadata: Metadata = {
	title: `Личный кабинет | ${CONFIG.STORE_NAME} ${CONFIG.CITY}`,
	description: `Ваши заказы, записи на ТО и данные профиля в ${CONFIG.STORE_NAME}.`,
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
	return <ProfileShell>{children}</ProfileShell>;
}
