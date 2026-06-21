const DRAG_SCROLL_SPEED = 1.2;

type DragState = {
	active: boolean;
	element: HTMLElement | null;
	startX: number;
	startY: number;
	scrollLeft: number;
	scrollTop: number;
};

const dragState: DragState = {
	active: false,
	element: null,
	startX: 0,
	startY: 0,
	scrollLeft: 0,
	scrollTop: 0,
};

function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;

	return Boolean(
		target.closest(
			'input, textarea, select, button, a, label, [contenteditable="true"], .clearSearchButton, .dateFilter, .clickInfoBlock, .dragCell, [role="button"]',
		),
	);
}

function canScrollElement(element: HTMLElement) {
	return {
		x: element.scrollWidth > element.clientWidth + 1,
		y: element.scrollHeight > element.clientHeight + 1,
	};
}

function updateScrollCursor(element: HTMLElement) {
	const { x, y } = canScrollElement(element);
	element.classList.toggle("canDragScroll", x || y);
	if (!dragState.active) {
		element.style.cursor = x || y ? "grab" : "";
	}
}

function stopDragScroll() {
	if (!dragState.element) return;

	dragState.element.classList.remove("isDragScrolling");
	updateScrollCursor(dragState.element);
	dragState.active = false;
	dragState.element = null;
}

function onMouseMove(event: MouseEvent) {
	if (!dragState.active || !dragState.element) return;

	event.preventDefault();
	const deltaX = (event.pageX - dragState.startX) * DRAG_SCROLL_SPEED;
	const deltaY = (event.pageY - dragState.startY) * DRAG_SCROLL_SPEED;
	dragState.element.scrollLeft = dragState.scrollLeft - deltaX;
	dragState.element.scrollTop = dragState.scrollTop - deltaY;
}

function onMouseUp() {
	stopDragScroll();
}

function onMouseDown(event: MouseEvent) {
	if (event.button !== 0 || dragState.active) return;

	const target = event.target;
	if (!(target instanceof Element)) return;

	const scrollElement = target.closest<HTMLElement>(".adminTableDragScroll");
	if (!scrollElement || isInteractiveTarget(target)) return;

	const { x, y } = canScrollElement(scrollElement);
	if (!x && !y) return;

	dragState.active = true;
	dragState.element = scrollElement;
	dragState.startX = event.pageX;
	dragState.startY = event.pageY;
	dragState.scrollLeft = scrollElement.scrollLeft;
	dragState.scrollTop = scrollElement.scrollTop;

	scrollElement.classList.add("isDragScrolling");
	scrollElement.style.cursor = "grabbing";
	event.preventDefault();
}

function refreshScrollTargets(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>(".adminTableDragScroll").forEach(updateScrollCursor);
}

function bindTableContentElements(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>(".tableContent").forEach((tableContent) => {
		if (!tableContent.querySelector("table.table, table")) return;
		if (tableContent.classList.contains("contentComponent")) return;

		tableContent.classList.add("adminTableDragScroll");
		updateScrollCursor(tableContent);
	});
}

let initialized = false;

export function initAdminTableDragScroll() {
	if (initialized || typeof window === "undefined") return;
	initialized = true;

	document.addEventListener("mousedown", onMouseDown);
	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);
	window.addEventListener("resize", () => refreshScrollTargets());

	bindTableContentElements();
	refreshScrollTargets();

	const observer = new MutationObserver(() => {
		bindTableContentElements();
		refreshScrollTargets();
	});

	observer.observe(document.body, { childList: true, subtree: true });
}
