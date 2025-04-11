-- DropIndex
DROP INDEX `product_sku_brand_idx` ON `product`;

-- CreateIndex
CREATE INDEX `product_title_idx` ON `product`(`title`);

-- CreateIndex
CREATE INDEX `product_sku_idx` ON `product`(`sku`);

-- CreateIndex
CREATE INDEX `product_brand_idx` ON `product`(`brand`);
