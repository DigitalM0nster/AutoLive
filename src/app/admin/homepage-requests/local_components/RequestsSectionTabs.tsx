import Link from "next/link";

type Props = {
	active: "requests" | "form";
};

/** Вкладки раздела заявок: список и настройка формы */
export default function RequestsSectionTabs({ active }: Props) {
	return (
		<div className="tabsContainer">
			{active === "requests" ? (
				<div className="tabButton active">Заявки с сайта</div>
			) : (
				<Link href="/admin/homepage-requests" className="tabButton">
					Заявки с сайта
				</Link>
			)}
			{active === "form" ? (
				<div className="tabButton active">Форма обратной связи</div>
			) : (
				<Link href="/admin/site-feedback-form" className="tabButton">
					Форма обратной связи
				</Link>
			)}
		</div>
	);
}
