import { Onest } from "next/font/google";

// Единый премиальный sans: заголовки и UI — без засечек, отличная кириллица
export const onest = Onest({
	subsets: ["latin", "cyrillic"],
	variable: "--font-site",
	display: "swap",
	weight: ["400", "500", "600", "700"],
});

export const siteFontVariables = onest.variable;
