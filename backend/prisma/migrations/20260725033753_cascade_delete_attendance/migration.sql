-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_event_id_fkey";

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
