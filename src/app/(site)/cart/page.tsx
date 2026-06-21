import { Suspense } from "react";
import NavigationMenu from "@/components/user/navigationMenu/NavigationMenu";
import CartContent from "./CartContent";
import CartSkeleton from "./CartSkeleton";
import styles from "./styles.module.scss";

export default function CartPage() {
	return (
		<div className="screen">
			<div className="screenContent">
				<NavigationMenu />
				<h1 className="pageTitle">Корзина</h1>
				<p className="pageLead">Проверьте состав заказа, укажите контакты и оформите заявку.</p>

				<Suspense fallback={<CartSkeleton />}>
					<CartContent />
				</Suspense>
			</div>
		</div>
	);
}
