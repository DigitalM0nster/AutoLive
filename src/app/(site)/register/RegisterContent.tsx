// src\app\register\RegisterContent.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.scss";
import PhoneInput from "./PhoneInput";
import CodeConfirmation from "./CodeConfirmation";
import UserDataForm from "./UserDataForm";
import { showSuccessToast } from "@/components/ui/toast/ToastProvider";

export default function RegisterContent() {
	const router = useRouter();

	const [phone, setPhone] = useState<string>("");
	const [formattedPhone, setFormattedPhone] = useState<string>("");
	const [code, setCode] = useState<string[]>(["", "", "", ""]);
	const [isCodeSent, setIsCodeSent] = useState<boolean>(false);
	const [isCodeConfirmed, setIsCodeConfirmed] = useState<boolean>(false);
	const [phoneError, setPhoneError] = useState<string>("");
	const [codeError, setCodeError] = useState<string>("");
	const [expiresIn, setExpiresIn] = useState<number>(0);
	const [userData, setUserData] = useState({
		first_name: "",
		last_name: "",
		middle_name: "",
	});

	useEffect(() => {
		const interval = setInterval(() => {
			setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);
		return () => clearInterval(interval);
	}, [expiresIn]);

	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const urlPhone = urlParams.get("phone");
		const urlCode = urlParams.get("code");

		if (urlPhone && urlCode) {
			confirmRegistration(urlPhone, urlCode);
		} else {
			const savedPhone = localStorage.getItem("phone");
			const savedCodeSent = localStorage.getItem("isCodeSent");

			if (savedPhone && savedCodeSent) {
				setPhone(savedPhone);
				setFormattedPhone(savedPhone);

				fetch("/api/user/auth/register/check-code", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone: savedPhone }),
				})
					.then((res) => res.json())
					.then((data) => {
						if (data.success) {
							setIsCodeSent(true);
							setExpiresIn(data.expires_in);
						} else {
							resetRegistration();
						}
					})
					.catch((error) => console.error("Ошибка проверки кода:", error));
			}
		}
	}, []);

	const resetRegistration = () => {
		localStorage.removeItem("phone");
		localStorage.removeItem("isCodeSent");
		setPhone("");
		setFormattedPhone("");
		setCode(["", "", "", ""]);
		setIsCodeSent(false);
		setIsCodeConfirmed(false);
		setPhoneError("");
		setCodeError("");
	};

	const confirmRegistration = async (inputPhone: string, inputCode: string) => {
		if (inputCode.length !== 4) {
			setCodeError("Введите полный код");
			return;
		}

		try {
			const response = await fetch("/api/user/auth/register/verify-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone: inputPhone, code: inputCode }),
			});
			const data = await response.json();

			if (response.ok) {
				setIsCodeConfirmed(true);
			} else {
				setCodeError(data.error || "Ошибка проверки кода, попробуйте снова");
			}
		} catch (error) {
			console.error("Ошибка confirmRegistration:", error);
			setCodeError("Ошибка сети, попробуйте позже");
		}
	};

	const submitUserData = async () => {
		try {
			const response = await fetch("/api/user/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					phone,
					code: code.join(""),
					first_name: userData.first_name,
					last_name: userData.last_name,
					middle_name: userData.middle_name,
				}),
			});
			const data = await response.json();

			if (response.ok) {
				localStorage.removeItem("phone");
				localStorage.removeItem("isCodeSent");
				showSuccessToast("Регистрация успешна!");
				router.push("/");
			} else {
				setCodeError(data.error || "Ошибка регистрации, попробуйте снова");
			}
		} catch (error) {
			console.error("Ошибка при регистрации:", error);
			setCodeError("Ошибка сети, попробуйте позже");
		}
	};

	return (
		<div className={styles.registerContentBlock}>
			{!isCodeSent ? (
				<PhoneInput
					phone={phone}
					formattedPhone={formattedPhone}
					setPhone={setPhone}
					setFormattedPhone={setFormattedPhone}
					setIsCodeSent={setIsCodeSent}
					setPhoneError={setPhoneError}
					phoneError={phoneError}
					setExpiresIn={setExpiresIn}
				/>
			) : !isCodeConfirmed ? (
				<CodeConfirmation
					code={code}
					setCode={setCode}
					expiresIn={expiresIn}
					phone={phone}
					onBack={() => setIsCodeSent(false)}
					onConfirm={() => confirmRegistration(phone, code.join(""))}
					codeError={codeError}
					setCodeError={setCodeError}
				/>
			) : (
				<UserDataForm userData={userData} setUserData={setUserData} onSubmit={submitUserData} onBack={() => setIsCodeConfirmed(false)} error={codeError} />
			)}
		</div>
	);
}
