-- На Vercel изображения хранятся как data URL (base64), они длиннее VARCHAR(255)
ALTER TABLE "Promotion" ALTER COLUMN "image" TYPE TEXT;
