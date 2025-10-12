ALTER TABLE "public"."summarized_content" DROP CONSTRAINT "summarized_content_user_id_fkey";
ALTER TABLE "memories" DROP COLUMN "page_structure",
DROP COLUMN "user_activity";
ALTER TABLE "users" DROP COLUMN "privy_user_id";
DROP TABLE "public"."summarized_content";