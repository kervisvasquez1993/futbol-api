import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionPlayerStats1790804384972 implements MigrationInterface {
    name = 'AddSessionPlayerStats1790804384972'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_player_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "player_id" uuid NOT NULL, "goals" smallint NOT NULL DEFAULT '0', "assists" smallint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_5d58ac3d7d32401126b7c9d2a53" UNIQUE ("session_id", "player_id"), CONSTRAINT "CHK_7b5a39603f4e6c3e17ae111afb" CHECK ("assists" >= 0 AND "assists" <= 50), CONSTRAINT "CHK_4c8dbf9e70be7e437c883f3bc8" CHECK ("goals" >= 0 AND "goals" <= 50), CONSTRAINT "PK_7672eea36f7b9567c8fb368e393" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "session_player_stats" ADD CONSTRAINT "FK_88d46f0acd0e18161a7d534e5fa" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_player_stats" ADD CONSTRAINT "FK_d9f498263ac70b87fc8e7df1e42" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_player_stats" DROP CONSTRAINT "FK_d9f498263ac70b87fc8e7df1e42"`);
        await queryRunner.query(`ALTER TABLE "session_player_stats" DROP CONSTRAINT "FK_88d46f0acd0e18161a7d534e5fa"`);
        await queryRunner.query(`DROP TABLE "session_player_stats"`);
    }

}
