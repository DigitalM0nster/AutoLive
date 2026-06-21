-- Поля этапов заказа (забронирован → возврат), ранее жили только в форме
ALTER TABLE "order"
    ADD COLUMN "booked_until" TIMESTAMP(0),
    ADD COLUMN "ready_until" TIMESTAMP(0),
    ADD COLUMN "prepayment_amount" DOUBLE PRECISION,
    ADD COLUMN "prepayment_date" TIMESTAMP(0),
    ADD COLUMN "payment_date" TIMESTAMP(0),
    ADD COLUMN "order_amount" DOUBLE PRECISION,
    ADD COLUMN "completion_date" TIMESTAMP(0),
    ADD COLUMN "return_reason" VARCHAR(500),
    ADD COLUMN "return_date" TIMESTAMP(0),
    ADD COLUMN "return_amount" DOUBLE PRECISION,
    ADD COLUMN "return_payment_date" TIMESTAMP(0),
    ADD COLUMN "return_document_number" VARCHAR(100);
