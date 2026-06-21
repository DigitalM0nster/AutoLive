-- Блок «Сервис» на главной: тексты и фоновое изображение баннера
ALTER TABLE "homepage_content"
    ADD COLUMN "service_block_title" VARCHAR(255) NOT NULL DEFAULT 'Запись на ТО',
    ADD COLUMN "service_block_subtitle" VARCHAR(500) NOT NULL DEFAULT 'Выберите удобное время и запишитесь на техническое обслуживание в нашем сервисе',
    ADD COLUMN "service_block_cta_text" VARCHAR(255) NOT NULL DEFAULT 'Записаться на обслуживание',
    ADD COLUMN "service_block_image_url" VARCHAR(500);
