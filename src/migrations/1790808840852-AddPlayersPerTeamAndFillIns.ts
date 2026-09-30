import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayersPerTeamAndFillIns1790808840852 implements MigrationInterface {
    name = 'AddPlayersPerTeamAndFillIns1790808840852'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_sessions" ADD "players_per_team" smallint`);
        await queryRunner.query(`ALTER TABLE "match_participants" ADD "is_fill_in" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ADD CONSTRAINT "CHK_0e75465f7c9268273fe43eec53" CHECK ("players_per_team" IS NULL OR ("players_per_team" >= 1 AND "players_per_team" <= 20))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_sessions" DROP CONSTRAINT "CHK_0e75465f7c9268273fe43eec53"`);
        await queryRunner.query(`ALTER TABLE "match_participants" DROP COLUMN "is_fill_in"`);
        await queryRunner.query(`ALTER TABLE "match_sessions" DROP COLUMN "players_per_team"`);
    }

}
