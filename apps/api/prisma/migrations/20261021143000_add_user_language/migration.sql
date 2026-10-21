CREATE TYPE "Language" AS ENUM ('EN', 'DE');

ALTER TABLE "User"
ADD COLUMN "language" "Language" NOT NULL DEFAULT 'EN';
