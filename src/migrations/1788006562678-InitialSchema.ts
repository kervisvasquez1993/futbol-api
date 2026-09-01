import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788006562678 implements MigrationInterface {
    name = 'InitialSchema1788006562678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'member')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'member', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "image_url" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de22b8fdeee0c33ab55ae71da3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."match_participants_team_enum" AS ENUM('home', 'away')`);
        await queryRunner.query(`CREATE TABLE "match_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "match_id" uuid NOT NULL, "player_id" uuid NOT NULL, "team" "public"."match_participants_team_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5c1d99767f747f4153f72cdb02c" UNIQUE ("match_id", "player_id"), CONSTRAINT "PK_0ad61c7059cbe8a5c85c34376c1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."matches_status_enum" AS ENUM('en_curso', 'finalizado')`);
        await queryRunner.query(`CREATE TABLE "matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."matches_status_enum" NOT NULL DEFAULT 'en_curso', "home_team_name" character varying NOT NULL DEFAULT 'Equipo A', "away_team_name" character varying NOT NULL DEFAULT 'Equipo B', "home_score" integer NOT NULL DEFAULT '0', "away_score" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a22c7b2e0828988d51256117f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "goals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "match_id" uuid NOT NULL, "scorer_id" uuid NOT NULL, "assist_id" uuid, "minute" smallint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_26e17b251afab35580dff769223" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "match_participants" ADD CONSTRAINT "FK_997994aee635254fc31adec7440" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "match_participants" ADD CONSTRAINT "FK_742937314775ecdd06d4f87c098" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_2f038c72761fa3e145e65388841" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_d8baac3c035549d5b90761f0034" FOREIGN KEY ("scorer_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "goals" ADD CONSTRAINT "FK_61e3a620b807b043892bf903f06" FOREIGN KEY ("assist_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_61e3a620b807b043892bf903f06"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_d8baac3c035549d5b90761f0034"`);
        await queryRunner.query(`ALTER TABLE "goals" DROP CONSTRAINT "FK_2f038c72761fa3e145e65388841"`);
        await queryRunner.query(`ALTER TABLE "match_participants" DROP CONSTRAINT "FK_742937314775ecdd06d4f87c098"`);
        await queryRunner.query(`ALTER TABLE "match_participants" DROP CONSTRAINT "FK_997994aee635254fc31adec7440"`);
        await queryRunner.query(`DROP TABLE "goals"`);
        await queryRunner.query(`DROP TABLE "matches"`);
        await queryRunner.query(`DROP TYPE "public"."matches_status_enum"`);
        await queryRunner.query(`DROP TABLE "match_participants"`);
        await queryRunner.query(`DROP TYPE "public"."match_participants_team_enum"`);
        await queryRunner.query(`DROP TABLE "players"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
