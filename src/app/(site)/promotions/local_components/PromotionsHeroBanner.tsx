"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import PromotionCtaButtons from "./PromotionCtaButtons";
import styles from "./PromotionsHeroBanner.module.scss";
import type { PromotionButton } from "@/lib/promotionButtons";
import { HomepageContentData } from "@/app/api/homepage-content/route";

export type PromotionBannerSlide = {
	id: number;
	title: string;
	description: string | null;
	image: string | null;
	period: string | null;
	buttons: PromotionButton[];
	formData?: HomepageContentData;
};

type PromotionsHeroBannerProps = {
	slides: PromotionBannerSlide[];
};

const AUTO_SLIDE_MS = 7000;
const BG_ANIMATION_MS = 500;
const TEXT_ANIMATION_MS = 420;
const HERO_OVERLAY_OPACITY = 0.52;

function truncateText(value: string, maxLength: number): string {
	const trimmed = value.trim();
	if (trimmed.length <= maxLength) return trimmed;
	return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export default function PromotionsHeroBanner({ slides }: PromotionsHeroBannerProps) {
	const [slideIndex, setSlideIndex] = useState(0);
	const [textPhase, setTextPhase] = useState<"idle" | "exit" | "enter">("enter");
	const [exitTextIndex, setExitTextIndex] = useState<number | null>(null);
	const [enterTextIndex, setEnterTextIndex] = useState<number | null>(0);
	const [bgShownIndex, setBgShownIndex] = useState(0);
	const [bgLeavingIndex, setBgLeavingIndex] = useState<number | null>(null);
	const [bgEnteringIndex, setBgEnteringIndex] = useState<number | null>(null);

	const pendingBgIndexRef = useRef(0);
	const bgShownIndexRef = useRef(0);
	const pendingSlideIndexRef = useRef(0);
	const phaseTokenRef = useRef(0);
	const textPhaseTimerRef = useRef<number | null>(null);
	const bgTimerRef = useRef<number | null>(null);
	const autoTimerRef = useRef<number | null>(null);

	const slidesSafe = slides.length > 0 ? slides : [];

	const visibleTextIndex =
		textPhase === "exit" && exitTextIndex !== null
			? exitTextIndex
			: textPhase === "enter" && enterTextIndex !== null
				? enterTextIndex
				: slideIndex;

	function clearTextPhaseTimer() {
		if (textPhaseTimerRef.current !== null) {
			window.clearTimeout(textPhaseTimerRef.current);
			textPhaseTimerRef.current = null;
		}
	}

	function clearBgTimer() {
		if (bgTimerRef.current !== null) {
			window.clearTimeout(bgTimerRef.current);
			bgTimerRef.current = null;
		}
	}

	function scheduleTextPhase(ms: number, token: number, onDone: () => void) {
		clearTextPhaseTimer();
		textPhaseTimerRef.current = window.setTimeout(() => {
			if (phaseTokenRef.current !== token) return;
			textPhaseTimerRef.current = null;
			onDone();
		}, ms);
	}

	function beginBgEnterPhase() {
		setBgLeavingIndex(null);
		const target = pendingBgIndexRef.current;
		if (target === bgShownIndexRef.current) {
			bgTimerRef.current = null;
			return;
		}
		setBgEnteringIndex(target);
		bgTimerRef.current = window.setTimeout(() => {
			setBgShownIndex(target);
			bgShownIndexRef.current = target;
			setBgEnteringIndex(null);
			bgTimerRef.current = null;
		}, BG_ANIMATION_MS);
	}

	function startBgTransition(toIndex: number) {
		pendingBgIndexRef.current = toIndex;

		if (bgLeavingIndex !== null) return;

		if (bgEnteringIndex !== null) {
			clearBgTimer();
			setBgLeavingIndex(bgEnteringIndex);
			setBgEnteringIndex(null);
			bgTimerRef.current = window.setTimeout(beginBgEnterPhase, BG_ANIMATION_MS);
			return;
		}

		if (toIndex === bgShownIndex) return;

		clearBgTimer();
		setBgLeavingIndex(bgShownIndex);
		bgTimerRef.current = window.setTimeout(beginBgEnterPhase, BG_ANIMATION_MS);
	}

	function beginEnterPhase(targetIndex: number) {
		const token = ++phaseTokenRef.current;
		setTextPhase("enter");
		setEnterTextIndex(targetIndex);
		setExitTextIndex(null);
		setSlideIndex(targetIndex);
		pendingSlideIndexRef.current = targetIndex;

		scheduleTextPhase(TEXT_ANIMATION_MS, token, () => {
			const pending = pendingSlideIndexRef.current;
			if (pending !== targetIndex) {
				beginExitPhase(targetIndex, pending);
				return;
			}
			setTextPhase("idle");
			setEnterTextIndex(null);
			setSlideIndex(targetIndex);
		});
	}

	function beginExitPhase(fromIndex: number, toIndex: number) {
		const token = ++phaseTokenRef.current;
		pendingSlideIndexRef.current = toIndex;
		setSlideIndex(toIndex);
		setTextPhase("exit");
		setExitTextIndex(fromIndex);
		setEnterTextIndex(null);
		startBgTransition(toIndex);

		scheduleTextPhase(TEXT_ANIMATION_MS, token, () => {
			beginEnterPhase(pendingSlideIndexRef.current);
		});
	}

	function requestSlideTransition(nextIndex: number) {
		if (slidesSafe.length <= 1) return;
		const target = ((nextIndex % slidesSafe.length) + slidesSafe.length) % slidesSafe.length;

		if (textPhase === "idle") {
			if (target === slideIndex) return;
			beginExitPhase(slideIndex, target);
			return;
		}

		pendingSlideIndexRef.current = target;
		setSlideIndex(target);
		startBgTransition(target);
	}

	function goToPrevSlide() {
		const current = textPhase === "idle" ? slideIndex : pendingSlideIndexRef.current;
		requestSlideTransition(current - 1);
	}

	function goToNextSlide() {
		const current = textPhase === "idle" ? slideIndex : pendingSlideIndexRef.current;
		requestSlideTransition(current + 1);
	}

	useEffect(() => {
		if (slidesSafe.length <= 1) {
			setTextPhase("idle");
			setEnterTextIndex(null);
			setExitTextIndex(null);
			return;
		}

		const token = ++phaseTokenRef.current;
		setTextPhase("enter");
		setEnterTextIndex(0);
		setExitTextIndex(null);
		setSlideIndex(0);
		setBgShownIndex(0);
		bgShownIndexRef.current = 0;
		setBgLeavingIndex(null);
		setBgEnteringIndex(null);
		pendingBgIndexRef.current = 0;
		pendingSlideIndexRef.current = 0;

		scheduleTextPhase(TEXT_ANIMATION_MS, token, () => {
			setTextPhase("idle");
			setEnterTextIndex(null);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps -- стартовая анимация при смене числа слайдов
	}, [slidesSafe.length]);

	useEffect(() => {
		if (slidesSafe.length <= 1) return;
		if (autoTimerRef.current !== null) window.clearInterval(autoTimerRef.current);
		autoTimerRef.current = window.setInterval(() => {
			const current = textPhase === "idle" ? slideIndex : pendingSlideIndexRef.current;
			requestSlideTransition(current + 1);
		}, AUTO_SLIDE_MS);
		return () => {
			if (autoTimerRef.current !== null) {
				window.clearInterval(autoTimerRef.current);
				autoTimerRef.current = null;
			}
		};
	}, [slideIndex, textPhase, slidesSafe.length]);

	useEffect(() => {
		return () => {
			clearTextPhaseTimer();
			clearBgTimer();
			if (autoTimerRef.current !== null) {
				window.clearInterval(autoTimerRef.current);
			}
		};
	}, []);

	function renderSlideContent(index: number, phase: "idle" | "exit" | "enter", headingTag: "h1" | "h2" | "div") {
		const slide = slidesSafe[index];
		if (!slide) return null;

		const Heading = headingTag;
		const phaseClass =
			phase === "exit" ? styles.heroContentLeaving : phase === "enter" ? styles.heroContentEntering : styles.heroContentIdle;

		return (
			<div className={`${styles.heroContentInner} ${phaseClass}`}>
				{slide.period && (
					<p className={styles.heroPeriod}>
						<span className={styles.heroPeriodIcon} aria-hidden="true" />
						{slide.period}
					</p>
				)}
				<Heading className={styles.heroTitle}>{slide.title}</Heading>
				{slide.description && <p className={styles.heroSubtitle}>{truncateText(slide.description, 140)}</p>}
				<PromotionCtaButtons
					buttons={slide.buttons}
					promotionId={slide.id}
					promotionTitle={slide.title}
					formData={slide.formData}
					variant="hero"
				/>
			</div>
		);
	}

	if (slidesSafe.length === 0) return null;

	return (
		<section className={styles.heroScreen} aria-label="Акции" aria-roledescription="carousel">
			<div className={styles.heroBgStack} style={{ "--heroBgDuration": `${BG_ANIMATION_MS}ms` } as CSSProperties}>
				{slidesSafe.map((slide, index) => {
					const isLeaving = index === bgLeavingIndex;
					const isEntering = index === bgEnteringIndex;
					const isShown = index === bgShownIndex && bgLeavingIndex === null && bgEnteringIndex === null;
					const isVisible = isLeaving || isEntering || isShown;
					const layerClass = isLeaving ? styles.heroBgLeaving : isEntering || isShown ? styles.heroBgActive : null;

					return (
						<div key={slide.id} className={[styles.heroBg, layerClass].filter(Boolean).join(" ")} aria-hidden={!isVisible}>
							<img src={slide.image || "/images/no-image.png"} alt="" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
							<div className={styles.heroOverlay} style={{ opacity: HERO_OVERLAY_OPACITY }} />
						</div>
					);
				})}
			</div>

			<div className={styles.heroContentStack}>
				{textPhase === "exit" && exitTextIndex !== null ? renderSlideContent(exitTextIndex, "exit", "div") : null}
				{textPhase === "enter" && enterTextIndex !== null ? renderSlideContent(enterTextIndex, "enter", slidesSafe.length === 1 ? "h1" : "h2") : null}
				{textPhase === "idle" ? renderSlideContent(visibleTextIndex, "idle", slidesSafe.length === 1 ? "h1" : "h2") : null}
			</div>

			{slidesSafe.length > 1 ? (
				<>
					<button type="button" className={`${styles.heroNav} ${styles.heroNavPrev}`} onClick={goToPrevSlide} aria-label="Предыдущая акция">
						<span className={styles.heroNavIcon} aria-hidden="true" />
					</button>
					<button type="button" className={`${styles.heroNav} ${styles.heroNavNext}`} onClick={goToNextSlide} aria-label="Следующая акция">
						<span className={styles.heroNavIcon} aria-hidden="true" />
					</button>
					<div className={styles.heroDots} role="tablist" aria-label="Переключение акций">
						{slidesSafe.map((slide, index) => {
							const isActive = index === slideIndex;
							return (
								<button
									key={slide.id}
									type="button"
									role="tab"
									className={[styles.heroDot, isActive ? styles.heroDotActive : ""].filter(Boolean).join(" ")}
									onClick={() => requestSlideTransition(index)}
									aria-label={`Акция ${index + 1}: ${slide.title}`}
									aria-selected={isActive}
								/>
							);
						})}
					</div>
				</>
			) : null}
		</section>
	);
}
