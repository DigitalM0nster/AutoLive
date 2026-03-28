"use client";

import { Building2, FileText, Headphones, MapPin, Phone, ShoppingCart, Wrench, type LucideIcon } from "lucide-react";
import type { FooterIconKey } from "@/lib/footerDisplay";

/** Единая карта ключей подвала → компонент Lucide (сайт + админка) */
export const FOOTER_LUCIDE_BY_KEY: Record<FooterIconKey, LucideIcon> = {
	mapPin: MapPin,
	wrench: Wrench,
	phone: Phone,
	building2: Building2,
	shoppingCart: ShoppingCart,
	fileText: FileText,
	headphones: Headphones,
};

type FooterLucideIconProps = {
	icon: FooterIconKey;
	size?: number;
	strokeWidth?: number;
	className?: string;
};

export function FooterLucideIcon({ icon, size = 20, strokeWidth = 1.75, className }: FooterLucideIconProps) {
	const Cmp = FOOTER_LUCIDE_BY_KEY[icon] ?? MapPin;
	return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
