-- DropIndex
DROP INDEX `product_sku_key` ON `product`;

-- CreateIndex
CREATE INDEX `product_sku_brand_idx` ON `product`(`sku`, `brand`);
