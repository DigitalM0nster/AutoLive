import React from "react";
import styles from "./styles.module.scss";

type ConfirmSummaryProps = {
	children: React.ReactNode;
};

export function ConfirmSummary({ children }: ConfirmSummaryProps) {
	return <div className={styles.summary}>{children}</div>;
}

export function ConfirmSummaryIntro({ children }: ConfirmSummaryProps) {
	return <p className={styles.summaryIntro}>{children}</p>;
}

export function ConfirmSummaryList({ children }: ConfirmSummaryProps) {
	return <div className={styles.summaryList}>{children}</div>;
}

type ConfirmSummaryRowProps = {
	label: string;
	value: React.ReactNode;
	imageUrl?: string;
};

export function ConfirmSummaryRow({ label, value, imageUrl }: ConfirmSummaryRowProps) {
	return (
		<div className={styles.summaryRow}>
			<div className={styles.summaryRowContent}>
				<span className={styles.summaryLabel}>{label}</span>
				<span className={styles.summaryValue}>{value}</span>
			</div>
			{imageUrl ? <img src={imageUrl} alt="" className={styles.summaryThumb} /> : null}
		</div>
	);
}

type ConfirmSummaryGroupProps = {
	title: string;
	children: React.ReactNode;
};

export function ConfirmSummaryGroup({ title, children }: ConfirmSummaryGroupProps) {
	return (
		<div className={styles.summaryGroup}>
			<div className={styles.summaryGroupTitle}>{title}</div>
			<div className={styles.summaryGroupBody}>{children}</div>
		</div>
	);
}

type ConfirmSummaryDiffProps = {
	label: string;
	from: string;
	to: string;
};

export function ConfirmSummaryDiff({ label, from, to }: ConfirmSummaryDiffProps) {
	return (
		<div className={styles.summaryDiff}>
			<span className={styles.summaryDiffLabel}>{label}</span>
			<div className={styles.summaryDiffValues}>
				<span className={styles.summaryDiffFrom}>{from}</span>
				<span className={styles.summaryDiffArrow}>→</span>
				<span className={styles.summaryDiffTo}>{to}</span>
			</div>
		</div>
	);
}

export function ConfirmSummaryGroupItem({ children }: ConfirmSummaryProps) {
	return <div className={styles.summaryGroupItem}>{children}</div>;
}

export function ConfirmSummaryWarning({ children }: ConfirmSummaryProps) {
	return <div className={styles.summaryWarning}>{children}</div>;
}

export function ConfirmSummaryMessage({ text }: { text: string }) {
	const lines = text.split("\n").filter(Boolean);

	return (
		<div className={styles.messageBlock}>
			{lines.map((line, index) => {
				const isBullet = line.startsWith("•");
				const isWarning = line.includes("⚠️");

				if (isWarning) {
					return (
						<ConfirmSummaryWarning key={index}>
							{line.replace("⚠️", "").trim()}
						</ConfirmSummaryWarning>
					);
				}

				if (isBullet) {
					return (
						<div key={index} className={styles.messageBullet}>
							{line.replace("•", "").trim()}
						</div>
					);
				}

				return (
					<p key={index} className={styles.messageLine}>
						{line}
					</p>
				);
			})}
		</div>
	);
}
