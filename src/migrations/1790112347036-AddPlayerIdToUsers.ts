import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerIdToUsers1790112347036 implements MigrationInterface {
    name = 'AddPlayerIdToUsers1790112347036'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "player_id" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_2e0df0c61c7b5738acbc103d7b8" UNIQUE ("player_id")`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_2e0df0c61c7b5738acbc103d7b8" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_2e0df0c61c7b5738acbc103d7b8"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_2e0df0c61c7b5738acbc103d7b8"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "player_id"`);
    }

}
