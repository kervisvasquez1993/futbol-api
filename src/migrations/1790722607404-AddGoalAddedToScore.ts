import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoalAddedToScore1790722607404 implements MigrationInterface {
    name = 'AddGoalAddedToScore1790722607404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "goals" ADD "added_to_score" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "goals" DROP COLUMN "added_to_score"`);
    }

}
