import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerPhysicalProfile1790128776255 implements MigrationInterface {
    name = 'AddPlayerPhysicalProfile1790128776255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "players" ADD "birth_date" date`);
        await queryRunner.query(`ALTER TABLE "players" ADD "height_cm" smallint`);
        await queryRunner.query(`ALTER TABLE "players" ADD "weight_kg" numeric(4,1)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "weight_kg"`);
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "height_cm"`);
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "birth_date"`);
    }

}
