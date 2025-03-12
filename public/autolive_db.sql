-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1
-- Время создания: Мар 12 2025 г., 11:02
-- Версия сервера: 10.4.32-MariaDB
-- Версия PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `autolive_db`
--

-- --------------------------------------------------------

--
-- Структура таблицы `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `categories`
--

INSERT INTO `categories` (`id`, `name`, `image_url`, `created_at`) VALUES
(1, 'Масла', 'oil.jpg', '2025-03-12 09:45:19'),
(2, 'Жидкости', 'liquids.jpg', '2025-03-12 09:45:19'),
(3, 'Фильтра', 'filters.jpg', '2025-03-12 09:45:19'),
(4, 'Прокладки', 'gaskets.jpg', '2025-03-12 09:45:19');

-- --------------------------------------------------------

--
-- Структура таблицы `filters`
--

CREATE TABLE `filters` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `filters`
--

INSERT INTO `filters` (`id`, `name`, `category_id`, `created_at`) VALUES
(1, 'Производитель', 1, '2025-03-12 09:45:31'),
(2, 'Вязкость (SAE)', 1, '2025-03-12 09:45:31'),
(3, 'Объем', 1, '2025-03-12 09:45:31'),
(4, 'Тип', 1, '2025-03-12 09:45:31'),
(5, 'Производитель', 2, '2025-03-12 09:45:31'),
(6, 'Назначение', 2, '2025-03-12 09:45:31'),
(7, 'Объем', 2, '2025-03-12 09:45:31'),
(8, 'Тип', 3, '2025-03-12 09:45:31'),
(9, 'Производитель', 3, '2025-03-12 09:45:31'),
(10, 'Производитель', 4, '2025-03-12 09:45:31'),
(11, 'Назначение (для)', 4, '2025-03-12 09:45:31');

-- --------------------------------------------------------

--
-- Структура таблицы `filter_values`
--

CREATE TABLE `filter_values` (
  `id` int(11) NOT NULL,
  `filter_id` int(11) NOT NULL,
  `value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `filter_values`
--

INSERT INTO `filter_values` (`id`, `filter_id`, `value`) VALUES
(1, 1, 'Castrol'),
(2, 1, 'ELF'),
(3, 1, 'Mobil'),
(4, 1, 'Shell'),
(5, 2, '5w20'),
(6, 2, '5w30'),
(7, 2, '5w40'),
(8, 2, '10W40'),
(9, 2, '15W40'),
(10, 3, '1'),
(11, 3, '2'),
(12, 3, '4'),
(13, 3, '5'),
(14, 3, '20'),
(15, 4, 'Минеральное'),
(16, 4, 'Полусинтетическое'),
(17, 4, 'Синтетическое'),
(18, 5, 'CASTROL'),
(19, 5, 'FEBI'),
(20, 5, 'Liqui Moly'),
(21, 5, 'MOBIL'),
(22, 5, 'ZIC'),
(23, 6, 'АКПП'),
(24, 6, 'ГУР'),
(25, 6, 'Тормозная'),
(26, 6, 'Трансмиссионная'),
(27, 7, '0.5'),
(28, 7, '1'),
(29, 7, '4'),
(30, 7, '20'),
(31, 8, 'Воздушный'),
(32, 8, 'Масляный'),
(33, 8, 'Салона'),
(34, 8, 'Топливный'),
(35, 9, 'Bosch'),
(36, 9, 'Carex'),
(37, 9, 'Meyle'),
(38, 9, 'Stellox'),
(39, 10, 'Ajusa'),
(40, 10, 'Elring'),
(41, 10, 'Febi'),
(42, 10, 'Stellox'),
(43, 11, 'Клапанной крышки'),
(44, 11, 'Коллектора впуск.'),
(45, 11, 'Коллектора выпуск.'),
(46, 11, 'Насоса масляного'),
(47, 11, 'Термостата');

-- --------------------------------------------------------

--
-- Структура таблицы `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `products`
--

INSERT INTO `products` (`id`, `name`, `category_id`, `price`, `image_url`, `created_at`) VALUES
(1, 'Моторное масло Castrol 5w30', 1, 25.99, 'oil_castrol_5w30.jpg', '2025-03-12 09:48:09'),
(2, 'Моторное масло ELF 10w40', 1, 19.50, 'oil_elf_10w40.jpg', '2025-03-12 09:48:09'),
(3, 'Моторное масло Mobil 5w40', 1, 29.99, 'oil_mobil_5w40.jpg', '2025-03-12 09:48:09'),
(4, 'Жидкость АКПП ZIC 1L', 2, 14.99, 'liquid_zic_1l.jpg', '2025-03-12 09:48:09'),
(5, 'Тормозная жидкость Liqui Moly', 2, 9.50, 'liquid_liqui_moly.jpg', '2025-03-12 09:48:09'),
(6, 'Фильтр воздушный Bosch', 3, 15.99, 'filter_bosch_air.jpg', '2025-03-12 09:48:09'),
(7, 'Фильтр масляный Carex', 3, 12.99, 'filter_carex_oil.jpg', '2025-03-12 09:48:09'),
(8, 'Прокладка клапанной крышки Ajusa', 4, 8.99, 'gasket_ajusa_valve.jpg', '2025-03-12 09:48:09'),
(9, 'Прокладка коллектора выпуск. Elring', 4, 11.50, 'gasket_elring_exhaust.jpg', '2025-03-12 09:48:09');

-- --------------------------------------------------------

--
-- Структура таблицы `product_filters`
--

CREATE TABLE `product_filters` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `filter_id` int(11) NOT NULL,
  `filter_value_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `product_filters`
--

INSERT INTO `product_filters` (`id`, `product_id`, `filter_id`, `filter_value_id`) VALUES
(1, 1, 1, 1),
(2, 1, 2, 6),
(3, 2, 1, 2),
(4, 2, 2, 8),
(5, 4, 5, 22),
(6, 4, 6, 23),
(7, 5, 5, 20),
(8, 5, 6, 25),
(9, 6, 8, 31),
(10, 6, 9, 35),
(11, 7, 8, 32),
(12, 7, 9, 36),
(13, 8, 10, 39),
(14, 8, 11, 43),
(15, 9, 10, 40),
(16, 9, 11, 45);

-- --------------------------------------------------------

--
-- Структура таблицы `sessions`
--

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `sms_codes`
--

CREATE TABLE `sms_codes` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('user','admin','manager') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Индексы таблицы `filters`
--
ALTER TABLE `filters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Индексы таблицы `filter_values`
--
ALTER TABLE `filter_values`
  ADD PRIMARY KEY (`id`),
  ADD KEY `filter_id` (`filter_id`);

--
-- Индексы таблицы `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `category_id` (`category_id`);

--
-- Индексы таблицы `product_filters`
--
ALTER TABLE `product_filters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `filter_id` (`filter_id`),
  ADD KEY `filter_value_id` (`filter_value_id`);

--
-- Индексы таблицы `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Индексы таблицы `sms_codes`
--
ALTER TABLE `sms_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT для таблицы `filters`
--
ALTER TABLE `filters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT для таблицы `filter_values`
--
ALTER TABLE `filter_values`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT для таблицы `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT для таблицы `product_filters`
--
ALTER TABLE `product_filters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT для таблицы `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `sms_codes`
--
ALTER TABLE `sms_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `filters`
--
ALTER TABLE `filters`
  ADD CONSTRAINT `filters_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `filter_values`
--
ALTER TABLE `filter_values`
  ADD CONSTRAINT `filter_values_ibfk_1` FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `product_filters`
--
ALTER TABLE `product_filters`
  ADD CONSTRAINT `product_filters_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_filters_ibfk_2` FOREIGN KEY (`filter_id`) REFERENCES `filters` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_filters_ibfk_3` FOREIGN KEY (`filter_value_id`) REFERENCES `filter_values` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ограничения внешнего ключа таблицы `sms_codes`
--
ALTER TABLE `sms_codes`
  ADD CONSTRAINT `sms_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
