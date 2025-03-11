"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.scss";
import { useRouter } from "next/navigation";

export default function RegisterContent() {
	const router = useRouter();

	const [phone, setPhone] = useState("");
	const [formattedPhone, setFormattedPhone] = useState("");
	const [code, setCode] = useState(["", "", "", ""]);
	const [isCodeSent, setIsCodeSent] = useState(false);
	const [phoneError, setPhoneError] = useState("");
	const [codeError, setCodeError] = useState("");

	// ТАЙМЕР
	const [expiresIn, setExpiresIn] = useState(0);
	useEffect(() => {
		if (expiresIn > 0) {
			const interval = setInterval(() => {
				setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [expiresIn]);

	// ПРОВЕРЯЕМ ЧТО ОТКРЫВАТЬ ПРИ ОТКРЫТИИ СТРАНИЦЫ РЕГИСТРАЦИИ
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

				// Проверяем на сервере, активен ли код
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
							// Код истёк, сбрасываем состояние
							resetRegistration();
						}
					})
					.catch((error) => console.error("Ошибка проверки кода:", error));
			}
		}
	}, []);

	// УБИРАЕМ ОШИБКУ ТЕЛЕФОНА ПРИ ИЗМЕНЕНИИ ТЕЛЕФОНА
	useEffect(() => {
		setPhoneError("");
	}, [phone, formattedPhone]);

	// Проверка, истёк ли код
	const checkCodeStatus = async (phone) => {
		try {
			const response = await fetch("/api/user/auth/register/check-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();

			if (data.success) {
				setExpiresIn(data.expires_in); // Устанавливаем таймер
			} else {
				resetRegistration(); // Код истёк, сбрасываем всё
			}
		} catch (error) {
			console.error("Ошибка проверки кода:", error);
		}
	};

	// Сброс регистрации
	const resetRegistration = () => {
		localStorage.removeItem("phone");
		localStorage.removeItem("isCodeSent");
		setPhone("");
		setFormattedPhone("");
		setCode(["", "", "", ""]);
		setIsCodeSent(false);
		setPhoneError("");
		setCodeError("");
	};

	// Обработчик ввода номера
	const handlePhoneChange = (e) => {
		const input = e.target;
		let rawValue = e.target.value.replace(/\D/g, ""); // Убираем все нецифровые символы

		// Убираем лишнюю 7, если пользователь ввёл её вручную
		if (rawValue.startsWith("7")) {
			rawValue = rawValue.slice(1);
		}

		// Оставляем максимум 10 цифр
		rawValue = rawValue.slice(0, 10);

		// Определяем, где был курсор перед изменением
		const cursorPos = input.selectionStart;
		const prevLength = formattedPhone.length;
		const isDeleting = e.nativeEvent.inputType === "deleteContentBackward";

		// Формируем маску с введёнными цифрами
		let mask = "+7 (___) ___-__-__".split("");
		let digitIndex = 0;
		for (let i = 0; i < mask.length; i++) {
			if (mask[i] === "_" && digitIndex < rawValue.length) {
				mask[i] = rawValue[digitIndex];
				digitIndex++;
			}
		}
		let newFormatted = mask.join("");

		// Логика перемещения курсора
		let newCursorPos = cursorPos;

		if (isDeleting) {
			// При удалении сдвигаем курсор влево, пока не наткнёмся на цифру
			while (newCursorPos > 4 && !/\d/.test(newFormatted[newCursorPos - 1])) {
				newCursorPos--;
			}
		} else {
			// При вводе курсор ставится после последней введённой цифры
			newCursorPos = newFormatted.indexOf("_");
			if (newCursorPos === -1) {
				newCursorPos = newFormatted.length; // Если все цифры введены, ставим в конец
			}
		}

		// Если все цифры удалены, курсор остаётся после "+7 "
		if (rawValue.length === 0) {
			newCursorPos = 4;
		}

		setPhone(rawValue);
		setFormattedPhone(newFormatted);

		// Восстанавливаем позицию курсора после рендера
		setTimeout(() => {
			input.setSelectionRange(newCursorPos, newCursorPos);
		}, 0);
	};

	// Отправка кода
	const sendCode = async () => {
		if (phone.length !== 10) {
			setPhoneError("Введите корректный номер телефона");
			return;
		}

		try {
			const response = await fetch("/api/user/auth/register/send-code", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone }),
			});
			const data = await response.json();
			console.log("📩 Ответ от сервера send-code:", data); // Логируем ответ сервера

			if (response.ok) {
				setIsCodeSent(true);
				setExpiresIn(data.expiresIn);
				localStorage.setItem("phone", phone);
				localStorage.setItem("isCodeSent", "true");

				// Сбрасываем ошибку для телефона, если код отправлен успешно
				setPhoneError("");
			} else {
				setPhoneError(data.error);
				if (data.remainingTime) {
					setIsCodeSent(true);
				}
			}
		} catch (error) {
			setPhoneError("Ошибка сети. Попробуйте снова");
		}
	};

	// Обработчик ввода кода
	const handleCodeChange = (index, event) => {
		const value = event.target.value.replace(/\D/g, ""); // Только цифры
		setCodeError("");

		if (value) {
			const newCode = [...code];
			newCode[index] = value.slice(-1); // Всегда заменяем текущую цифру на новую
			setCode(newCode);

			// Переключаемся на следующий инпут, если он есть
			if (index < code.length - 1) {
				setTimeout(() => document.getElementById(`code-input-${index + 1}`).focus(), 0);
			}
		} else {
			// Если удаляем цифру, ставим пустое значение
			const newCode = [...code];
			newCode[index] = "";
			setCode(newCode);

			// Переключаемся на предыдущий инпут, если удаляем и не в первом инпуте
			if (index > 0) {
				setTimeout(() => document.getElementById(`code-input-${index - 1}`).focus(), 0);
			}
		}
	};

	// Подтверждение регистрации
	const confirmRegistration = async () => {
		const inputPhone = String(phone); // Убеждаемся, что это строка
		const inputCode = code.join(""); // Код должен быть строкой из 4 цифр

		if (inputCode.length !== 4) {
			setCodeError("Введите полный код");
			return;
		}

		try {
			console.log("📩 Отправляем запрос на сервер:", { phone: inputPhone, code: inputCode });

			const response = await fetch("/api/user/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phone: inputPhone, code: inputCode }), // 🛠 Преобразуем в JSON
			});

			const data = await response.json();
			console.log("📩 Ответ от сервера confirm-registration:", data);

			if (response.ok) {
				localStorage.removeItem("phone");
				localStorage.removeItem("isCodeSent");
				alert("Регистрация успешна!");
				router.push("/"); // Перенаправляем на главную
			} else {
				setCodeError(data.error || "Ошибка регистрации, попробуйте снова");
			}
		} catch (error) {
			console.error("❌ Ошибка confirmRegistration:", error);
			setCodeError("Ошибка сети, попробуйте позже");
		}
	};

	return (
		<div className={styles.registerContentBlock}>
			{!isCodeSent ? (
				<div className={styles.inputBlock}>
					<div className={styles.inputName}>Введите телефон</div>
					<div className={styles.inputPhone}>
						<input type="tel" value={formattedPhone} onChange={handlePhoneChange} placeholder="+7 (___) ___-__-__" />
					</div>
					<div className={`button ${styles.button}`} onClick={sendCode}>
						{isCodeSent ? "У меня есть код" : "Отправить код"}
					</div>

					{phoneError && <div className={styles.error}>{phoneError}</div>}
				</div>
			) : (
				<div className={styles.inputBlock}>
					<div className={styles.inputName}>Введите код</div>

					<div className={styles.inputCode}>
						{code.map((digit, index) => (
							<input
								key={index}
								id={`code-input-${index}`}
								type="text"
								pattern="[0-9]*"
								inputMode="numeric"
								value={digit}
								onChange={(e) => handleCodeChange(index, e)}
								maxLength="1"
							/>
						))}
					</div>
					{expiresIn > 0 && <div className={styles.timer}>Код истечёт через {expiresIn} сек.</div>}

					<div className={`button ${styles.button}`} onClick={confirmRegistration}>
						Подтвердить регистрацию
					</div>
					<div
						className={styles.backButton}
						onClick={() => {
							setIsCodeSent(false);
						}}
					>
						← Вернуться к началу регистрации
					</div>
					{codeError && <div className={styles.error}>{codeError}</div>}
				</div>
			)}
		</div>
	);
}
