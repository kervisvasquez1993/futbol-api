import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotifications1790822423221 implements MigrationInterface {
    name = 'AddNotifications1790822423221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('manual_stats_submitted', 'manual_stats_approved', 'manual_stats_rejected', 'manual_stats_set_by_admin')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "session_id" uuid, "player_id" uuid, "data" jsonb NOT NULL DEFAULT '{}', "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_310667f935698fcd8cb319113a" ON "notifications"  ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_4623cc3b1dd7a9fcee5eb0ec326" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_92fa9d0738c844d538932c59f4b" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_92fa9d0738c844d538932c59f4b"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_4623cc3b1dd7a9fcee5eb0ec326"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_310667f935698fcd8cb319113a"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
