"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Role } from "@/lib/rolesConfig";
import {
	ADMIN_DASHBOARD_NAV,
	AdminNavGroup,
	getAdminNavGroups,
	isAdminNavActive,
	isAdminNavGroupActive,
} from "@/lib/adminNavConfig";

type Props = {
	role: Role;
};

/** Небольшая пауза перед открытием — не срабатывает при случайном пролёте мыши */
const OPEN_DELAY_MS = 30;
/** Пауза перед закрытием — успеть перевести курсор на панель */
const CLOSE_DELAY_MS = 150;
/** Пауза перед сменой группы справа — не дёргается при промахе по списку */
const GROUP_SWITCH_DELAY_MS = 100;

function getDefaultGroupId(pathname: string, groups: AdminNavGroup[]): string | null {
	const activeGroup = groups.find((group) => isAdminNavGroupActive(pathname, group));
	return activeGroup?.id ?? groups[0]?.id ?? null;
}

function clearTimeoutRef(ref: { current: ReturnType<typeof setTimeout> | null }) {
	if (ref.current) {
		clearTimeout(ref.current);
		ref.current = null;
	}
}

export default function AdminNavMenu({ role }: Props) {
	const pathname = usePathname();
	const menuId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [canHover, setCanHover] = useState(true);
	const [displayedGroupId, setDisplayedGroupId] = useState<string | null>(null);

	const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const groupSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const groups = useMemo(() => getAdminNavGroups(role), [role]);
	const defaultGroupId = useMemo(() => getDefaultGroupId(pathname, groups), [pathname, groups]);
	const visibleGroupId = displayedGroupId ?? defaultGroupId;
	const visibleGroup = groups.find((group) => group.id === visibleGroupId) ?? groups[0] ?? null;

	useEffect(() => {
		const media = window.matchMedia("(hover: hover) and (pointer: fine)");
		const sync = () => setCanHover(media.matches);
		sync();
		media.addEventListener("change", sync);
		return () => media.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		setOpen(false);
		setDisplayedGroupId(null);
		clearTimeoutRef(groupSwitchTimerRef);
	}, [pathname]);

	useEffect(() => {
		return () => {
			clearTimeoutRef(openTimerRef);
			clearTimeoutRef(closeTimerRef);
			clearTimeoutRef(groupSwitchTimerRef);
		};
	}, []);

	const scheduleOpen = useCallback(() => {
		clearTimeoutRef(closeTimerRef);
		clearTimeoutRef(openTimerRef);

		openTimerRef.current = setTimeout(() => {
			setOpen(true);
			setDisplayedGroupId((current) => current ?? defaultGroupId);
		}, OPEN_DELAY_MS);
	}, [defaultGroupId]);

	const scheduleClose = useCallback(() => {
		clearTimeoutRef(openTimerRef);
		clearTimeoutRef(closeTimerRef);
		clearTimeoutRef(groupSwitchTimerRef);

		closeTimerRef.current = setTimeout(() => {
			setOpen(false);
		}, CLOSE_DELAY_MS);
	}, []);

	const handleGroupEnter = useCallback((groupId: string) => {
		clearTimeoutRef(groupSwitchTimerRef);

		groupSwitchTimerRef.current = setTimeout(() => {
			setDisplayedGroupId(groupId);
		}, GROUP_SWITCH_DELAY_MS);
	}, []);

	const handleGroupLeave = useCallback(() => {
		clearTimeoutRef(groupSwitchTimerRef);
	}, []);

	const handleRootEnter = useCallback(() => {
		if (!canHover) return;
		scheduleOpen();
	}, [canHover, scheduleOpen]);

	const handleRootLeave = useCallback(() => {
		if (!canHover) return;
		scheduleClose();
	}, [canHover, scheduleClose]);

	const handleTriggerClick = useCallback(() => {
		if (canHover) return;
		setOpen((value) => !value);
		if (!open) {
			setDisplayedGroupId(defaultGroupId);
		}
	}, [canHover, open, defaultGroupId]);

	const handleTriggerFocus = useCallback(() => {
		clearTimeoutRef(closeTimerRef);
		setOpen(true);
		setDisplayedGroupId((current) => current ?? defaultGroupId);
	}, [defaultGroupId]);

	useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	// На тач-устройствах меню открывается по клику — закрываем при тапе снаружи
	useEffect(() => {
		if (!open || canHover) return;

		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [open, canHover]);

	return (
		<div
			ref={rootRef}
			className={`navMenu${open ? " open" : ""}`}
			onMouseEnter={handleRootEnter}
			onMouseLeave={handleRootLeave}
		>
			<button
				type="button"
				className="navMenuTrigger"
				aria-expanded={open}
				aria-controls={menuId}
				aria-haspopup="true"
				onClick={handleTriggerClick}
				onFocus={handleTriggerFocus}
			>
				<span className="navMenuTriggerLabel">Разделы</span>
				<span className="navMenuTriggerChevron" aria-hidden="true" />
			</button>

			{open && (
				<div id={menuId} className="navMenuPanel" role="presentation">
					<div className="navMenuMega">
						<nav className="navMenuMegaSidebar" aria-label="Группы разделов">
							<ul className="navMenuSidebarList">
								<li>
									<Link
										href={ADMIN_DASHBOARD_NAV.href}
										className={`navMenuItem${isAdminNavActive(pathname, ADMIN_DASHBOARD_NAV) ? " active" : ""}`}
										onClick={() => setOpen(false)}
									>
										{ADMIN_DASHBOARD_NAV.label}
									</Link>
								</li>
							</ul>

							<ul className="navMenuSidebarList navMenuSidebarGroups">
								{groups.map((group) => {
									const isCurrent = visibleGroupId === group.id;
									const isGroupActive = isAdminNavGroupActive(pathname, group);

									return (
										<li
											key={group.id}
											className={[
												group.toneClass,
												isCurrent ? "current" : "",
												isGroupActive ? "hasActive" : "",
											]
												.filter(Boolean)
												.join(" ")}
											onMouseEnter={() => handleGroupEnter(group.id)}
											onMouseLeave={handleGroupLeave}
										>
											<span
												className="navMenuItem navMenuItemGroup"
												tabIndex={0}
												role="menuitem"
												onFocus={() => handleGroupEnter(group.id)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														setDisplayedGroupId(group.id);
													}
												}}
											>
												{group.label}
											</span>
										</li>
									);
								})}
							</ul>
						</nav>

						{visibleGroup && (
							<nav className={`navMenuMegaContent ${visibleGroup.toneClass}`} aria-label={visibleGroup.label}>
								<p className="navMenuMegaLabel">{visibleGroup.label}</p>
								<ul className="navMenuSublist">
									{visibleGroup.items.map((item) => (
										<li key={item.key}>
											<Link
												href={item.href}
												className={`navMenuSubLink${isAdminNavActive(pathname, item) ? " active" : ""}`}
												onClick={() => setOpen(false)}
											>
												<span className="navMenuSubLinkLabel">{item.label}</span>
												<span className="navMenuSubLinkArrow" aria-hidden="true" />
											</Link>
										</li>
									))}
								</ul>
							</nav>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
