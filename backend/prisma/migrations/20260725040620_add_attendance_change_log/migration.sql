-- CreateTable
CREATE TABLE "attendance_record_changes" (
    "id" UUID NOT NULL,
    "attendance_record_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "old_status" "AttendanceStatus",
    "new_status" "AttendanceStatus" NOT NULL,
    "change_type" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_record_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_attendance_changes_record" ON "attendance_record_changes"("attendance_record_id");

-- CreateIndex
CREATE INDEX "idx_attendance_changes_user" ON "attendance_record_changes"("changed_by_id");

-- AddForeignKey
ALTER TABLE "attendance_record_changes" ADD CONSTRAINT "attendance_record_changes_attendance_record_id_fkey" FOREIGN KEY ("attendance_record_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_record_changes" ADD CONSTRAINT "attendance_record_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
