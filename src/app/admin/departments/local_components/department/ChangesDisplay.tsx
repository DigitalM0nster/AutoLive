"use client";

import React from "react";
import { Plus, Minus, Edit3 } from "lucide-react";
import styles from "../styles.module.scss";

export interface ChangeItem {
	type: "name" | "categories_added" | "categories_removed" | "staff_added" | "staff_removed";
	title: string;
	description: string;
	items?: string[];
}

interface ChangesDisplayProps {
	changes: ChangeItem[];
}

export default function ChangesDisplay({ changes }: ChangesDisplayProps) {
	if (changes.length === 0) {
		return (
			<div className={styles.noChanges}>
				<p>Нет изменений для сохранения</p>
			</div>
		);
	}

	return (
		<div className={styles.changesContainer}>
			{changes.map((change, index) => (
				<div key={index} className={styles.changeItem}>
					<div className={styles.changeHeader}>
						{change.type === "name" && <Edit3 className={styles.changeIcon} size={16} />}
						{change.type === "categories_added" && <Plus className={styles.changeIcon} size={16} />}
						{change.type === "categories_removed" && <Minus className={styles.changeIcon} size={16} />}
						<span className={styles.changeTitle}>{change.title}</span>
					</div>
					<p className={styles.changeDescription}>{change.description}</p>
					{change.items && change.items.length > 0 && (
						<div className={styles.changeItems}>
							{change.items.map((item, itemIndex) => (
								<div key={itemIndex} className={styles.changeItemTag}>
									{item}
								</div>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
