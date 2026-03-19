"use client";

import React, { useEffect, useRef, useId } from "react";
import mapStyles from "./ContactsMap.module.scss";

export type MapPoint = {
	id: number;
	name: string | null;
	address: string;
	latitude: number;
	longitude: number;
};

type Props = {
	points: MapPoint[];
	/** Цвет меток на карте (hex, например #2c5aa0). Задаётся в админке: Контент → Контакты. */
	markerColor?: string;
	/** Масштаб карты 1–19. Не задано — авто (1 точка: 14, несколько: 12). */
	initialZoom?: number;
};

declare global {
	interface Window {
		ymaps: {
			ready: (fn: () => void) => void;
			Map: new (element: string | HTMLElement, state: { center: number[]; zoom: number }) => unknown;
			Placemark: new (coords: number[], properties?: object, options?: object) => unknown;
			geoObjects: { add: (obj: unknown) => void };
		};
	}
}

const SCRIPT_URL = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";

export default function ContactsMap({ points, markerColor, initialZoom }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<unknown>(null);
	const id = useId().replace(/:/g, "");
	const mapId = `contacts-map-${id}`;

	useEffect(() => {
		if (points.length === 0) return;

		const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
		const scriptUrl = apiKey ? `${SCRIPT_URL}&apikey=${apiKey}` : SCRIPT_URL;

		// Проверяем, не загружен ли уже API
		if (typeof window !== "undefined" && window.ymaps) {
			window.ymaps.ready(() => initMap());
			return;
		}

		const script = document.createElement("script");
		script.src = scriptUrl;
		script.async = true;
		script.onload = () => {
			window.ymaps.ready(() => initMap());
		};
		document.head.appendChild(script);
		return () => {
			script.remove();
			try {
				if (mapRef.current && typeof (mapRef.current as { destroy?: () => void }).destroy === "function") {
					(mapRef.current as { destroy: () => void }).destroy();
				}
			} catch {}
		};
	}, [points.length, markerColor, initialZoom]);

	function initMap() {
		if (!containerRef.current || !window.ymaps || points.length === 0) return;

		// Центр: по первой точке или по центру всех; зум из админки или авто (1 точка: 14, несколько: 12)
		const first = points[0];
		const center: [number, number] = [first.latitude, first.longitude];
		if (points.length > 1) {
			const lats = points.map((p) => p.latitude);
			const lngs = points.map((p) => p.longitude);
			center[0] = (Math.min(...lats) + Math.max(...lats)) / 2;
			center[1] = (Math.min(...lngs) + Math.max(...lngs)) / 2;
		}
		const zoom =
			initialZoom != null && initialZoom >= 1 && initialZoom <= 19 ? Math.round(initialZoom) : points.length > 1 ? 12 : 14;

		const map = new window.ymaps.Map(mapId, {
			center,
			zoom,
		});

		mapRef.current = map;

		const geoObjects = (map as { geoObjects: { add: (o: unknown) => void } }).geoObjects;
		const iconColor = markerColor && /^#[0-9A-Fa-f]{6}$/.test(markerColor) ? markerColor : "#2c5aa0";
		points.forEach((p) => {
			const placemark = new window.ymaps.Placemark(
				[p.latitude, p.longitude],
				{
					balloonContentHeader: p.name || "Точка",
					balloonContentBody: p.address,
					hintContent: p.name || p.address,
				},
				{ preset: "islands#circleDotIcon", iconColor }
			);
			geoObjects.add(placemark);
		});
	}

	if (points.length === 0) return null;

	return (
		<div className={mapStyles.contactsMapWrap}>
			<div id={mapId} ref={containerRef} className={mapStyles.contactsMapContainer} />
		</div>
	);
}
