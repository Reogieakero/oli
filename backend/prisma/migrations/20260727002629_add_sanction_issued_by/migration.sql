-- AlterTable
ALTER TABLE "sanctions" ADD COLUMN     "issued_by_id" UUID;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
