import { Suspense } from "react";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import CartContent from "./CartContent";
import CartSkeleton from "./CartSkeleton";
import styles from "./styles.module.scss";

export default function CartPage() {
	return (
		<div className={`screen ${styles.screen}`}>
			<div className="screenContent">
				<NavigationMenu />

				{/* Секция с контентом корзины с использованием Suspense для скелетона */}
				<Suspense fallback={<CartSkeleton />}>
					<CartContent />
				</Suspense>
			</div>
		</div>
	);
}
