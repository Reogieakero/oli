-- AlterTable
ALTER TABLE "events" ADD COLUMN     "archived_at" TIMESTAMP(6),
ADD COLUMN     "cover_photo" TEXT,
ADD COLUMN     "cover_photo_file_name" TEXT,
ADD COLUMN     "important_notice" TEXT;
