import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoalApprovalAndMatchNotifications1792540000000 implements MigrationInterface {
    name = 'AddGoalApprovalAndMatchNotifications1792540000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Los goles existentes quedan aprobados.
        await queryRunner.query(`CREATE TYPE "public"."goals_status_enum" AS ENUM('pendiente', 'aprobado')`);
        await queryRunner.query(`ALTER TABLE "goals" ADD "status" "public"."goals_status_enum" NOT NULL DEFAULT 'aprobado'`);
        await queryRunner.query(`ALTER TABLE "goals" ADD "created_by_user_id" uuid`);
        await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_523a54c618025aded1029972712" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'goal_submitted'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'goal_approved'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'goal_rejected'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "match_id" uuid`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_e74bbfb772dce73fb1de5e27a7e" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_e74bbfb772dce73fb1de5e27a7e"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "match_id"`);
        // Postgres no deja quitar valores de un enum: se recrea sin los goal_*.
        await queryRunner.query(`DELETE FROM "notifications" WHERE "type" IN ('goal_submitted', 'goal_approved', 'goal_rejected')`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('manual_stats_submitted', 'manual_stats_approved', 'manual_stats_rejected', 'manual_stats_set_by_admin')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);

        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_523a54c618025aded1029972712"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "created_by_user_id"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."goals_status_enum"`);
    }

}
