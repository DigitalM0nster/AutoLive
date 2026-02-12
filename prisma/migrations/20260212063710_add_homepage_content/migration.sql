-- CreateTable
CREATE TABLE "homepage_content" (
    "id" SERIAL NOT NULL,
    "first_block_title" VARCHAR(255) NOT NULL DEFAULT 'Выбрать запчасти с менеджером:',
    "call_button_text" VARCHAR(255) NOT NULL DEFAULT 'Позвонить в магазин',
    "order_button_text" VARCHAR(255) NOT NULL DEFAULT 'Оставить заказ',
    "form_fields" JSONB NOT NULL DEFAULT '[]',
    "form_submit_button_text" VARCHAR(255) NOT NULL DEFAULT 'Оставить заказ',
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_content_pkey" PRIMARY KEY ("id")
);
