import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionRotationAndQueue1790115874614 implements MigrationInterface {
    name = 'AddSessionRotationAndQueue1790115874614'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_teams" ADD "join_order" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "session_teams" ADD "queue_position" integer`);
        await queryRunner.query(`CREATE TYPE "public"."match_sessions_rotation_mode_enum" AS ENUM('manual', 'winner_stays')`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ADD "rotation_mode" "public"."match_sessions_rotation_mode_enum" NOT NULL DEFAULT 'manual'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_sessions" DROP COLUMN "rotation_mode"`);
        await queryRunner.query(`DROP TYPE "public"."match_sessions_rotation_mode_enum"`);
        await queryRunner.query(`ALTER TABLE "session_teams" DROP COLUMN "queue_position"`);
        await queryRunner.query(`ALTER TABLE "session_teams" DROP COLUMN "join_order"`);
    }

}
