-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "account_name" VARCHAR(100),
ADD COLUMN     "account_number" VARCHAR(100),
ADD COLUMN     "instructions" VARCHAR(255);
