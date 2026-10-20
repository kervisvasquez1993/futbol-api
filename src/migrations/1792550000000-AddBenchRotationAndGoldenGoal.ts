import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBenchRotationAndGoldenGoal1792550000000 implements MigrationInterface {
    name = 'AddBenchRotationAndGoldenGoal1792550000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."match_sessions_rotation_mode_enum" ADD VALUE 'bench_rotation'`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ADD "golden_goal" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "golden_goal" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "session_attendees" ADD "left_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_attendees" DROP COLUMN "left_at"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "golden_goal"`);
        await queryRunner.query(`ALTER TABLE "match_sessions" DROP COLUMN "golden_goal"`);
        // Postgres no deja quitar valores de un enum: se recrea sin bench_rotation.
        await queryRunner.query(`UPDATE "match_sessions" SET "rotation_mode" = 'winner_stays' WHERE "rotation_mode" = 'bench_rotation'`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "rotation_mode" DROP DEFAULT`);
        await queryRunner.query(`ALTER TYPE "public"."match_sessions_rotation_mode_enum" RENAME TO "match_sessions_rotation_mode_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."match_sessions_rotation_mode_enum" AS ENUM('manual', 'winner_stays')`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "rotation_mode" TYPE "public"."match_sessions_rotation_mode_enum" USING "rotation_mode"::"text"::"public"."match_sessions_rotation_mode_enum"`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "rotation_mode" SET DEFAULT 'manual'`);
        await queryRunner.query(`DROP TYPE "public"."match_sessions_rotation_mode_enum_old"`);
    }

}
