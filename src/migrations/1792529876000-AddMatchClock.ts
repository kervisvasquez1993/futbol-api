import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchClock1792529876000 implements MigrationInterface {
    name = 'AddMatchClock1792529876000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matches" ADD "started_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "paused_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "paused_seconds" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "CHK_matches_paused_seconds" CHECK ("paused_seconds" >= 0)`);
        // Los partidos en juego siguen contando desde que se crearon.
        await queryRunner.query(`UPDATE "matches" SET "started_at" = "created_at" WHERE "status" = 'en_curso'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "CHK_matches_paused_seconds"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "paused_seconds"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "paused_at"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "started_at"`);
    }

}
