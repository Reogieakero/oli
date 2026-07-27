-- CreateTable
CREATE TABLE "sanction_status_changes" (
    "id" UUID NOT NULL,
    "sanction_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "old_status" "SanctionStatus",
    "new_status" "SanctionStatus" NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanction_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sanction_changes_record" ON "sanction_status_changes"("sanction_id");

-- CreateIndex
CREATE INDEX "idx_sanction_changes_user" ON "sanction_status_changes"("changed_by_id");

-- AddForeignKey
ALTER TABLE "sanction_status_changes" ADD CONSTRAINT "sanction_status_changes_sanction_id_fkey" FOREIGN KEY ("sanction_id") REFERENCES "sanctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanction_status_changes" ADD CONSTRAINT "sanction_status_changes_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
