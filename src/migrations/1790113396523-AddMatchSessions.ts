import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchSessions1790113396523 implements MigrationInterface {
    name = 'AddMatchSessions1790113396523'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_team_players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_team_id" uuid NOT NULL, "player_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_05cbb7651788ca50e835708b6f5" UNIQUE ("session_team_id", "player_id"), CONSTRAINT "PK_e9a09eb7340bb9099fbf2c21d18" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "session_teams" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_038a4858d329ea49b0867e47719" UNIQUE ("session_id", "name"), CONSTRAINT "PK_62d08168ad5b9876c59fa169e13" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."match_sessions_status_enum" AS ENUM('en_curso', 'finalizada')`);
        await queryRunner.query(`CREATE TABLE "match_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."match_sessions_status_enum" NOT NULL DEFAULT 'en_curso', "duration_minutes" integer, "goal_limit" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_52f88c0fd969514ae22fa6ca920" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "duration_minutes" integer`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "goal_limit" integer`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "session_id" uuid`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "home_session_team_id" uuid`);
        await queryRunner.query(`ALTER TABLE "matches" ADD "away_session_team_id" uuid`);
        await queryRunner.query(`ALTER TABLE "session_team_players" ADD CONSTRAINT "FK_a57d5da7768bbe0af09a998b57f" FOREIGN KEY ("session_team_id") REFERENCES "session_teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_team_players" ADD CONSTRAINT "FK_639af23a173d2798a11e11f41da" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_teams" ADD CONSTRAINT "FK_d8dbda80e4de4f9ccf74fb1bd8e" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_bd03125435af95f8aaba5a672b4" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_a63ac9e828f8ce3a18d550d3d47" FOREIGN KEY ("home_session_team_id") REFERENCES "session_teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_2eeaa4168a5af372880ca0bdf9e" FOREIGN KEY ("away_session_team_id") REFERENCES "session_teams"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_2eeaa4168a5af372880ca0bdf9e"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_a63ac9e828f8ce3a18d550d3d47"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_bd03125435af95f8aaba5a672b4"`);
        await queryRunner.query(`ALTER TABLE "session_teams" DROP CONSTRAINT "FK_d8dbda80e4de4f9ccf74fb1bd8e"`);
        await queryRunner.query(`ALTER TABLE "session_team_players" DROP CONSTRAINT "FK_639af23a173d2798a11e11f41da"`);
        await queryRunner.query(`ALTER TABLE "session_team_players" DROP CONSTRAINT "FK_a57d5da7768bbe0af09a998b57f"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "away_session_team_id"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "home_session_team_id"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "session_id"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "goal_limit"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP COLUMN "duration_minutes"`);
        await queryRunner.query(`DROP TABLE "match_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."match_sessions_status_enum"`);
        await queryRunner.query(`DROP TABLE "session_teams"`);
        await queryRunner.query(`DROP TABLE "session_team_players"`);
    }

}
