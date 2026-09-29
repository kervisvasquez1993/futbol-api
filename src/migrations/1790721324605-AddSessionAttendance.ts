import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessionAttendance1790721324605 implements MigrationInterface {
    name = 'AddSessionAttendance1790721324605'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session_attendees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "session_id" uuid NOT NULL, "player_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f3e3a9cbc8310cbc62d3b6e61d4" UNIQUE ("session_id", "player_id"), CONSTRAINT "PK_e06eb5bccf5bff0d439fb4f6ba6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "players" ADD "is_guest" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TYPE "public"."match_sessions_status_enum" ADD VALUE 'convocatoria'`);
        await queryRunner.query(`ALTER TABLE "session_attendees" ADD CONSTRAINT "FK_d12f3d8a0eb3f9187419b59df42" FOREIGN KEY ("session_id") REFERENCES "match_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session_attendees" ADD CONSTRAINT "FK_804ca36ba19c417d81c595a10f1" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session_attendees" DROP CONSTRAINT "FK_804ca36ba19c417d81c595a10f1"`);
        await queryRunner.query(`ALTER TABLE "session_attendees" DROP CONSTRAINT "FK_d12f3d8a0eb3f9187419b59df42"`);
        // Las convocatorias que no llegaron a empezar no existen en el enum viejo.
        await queryRunner.query(`UPDATE "match_sessions" SET "status" = 'finalizada' WHERE "status" = 'convocatoria'`);
        await queryRunner.query(`CREATE TYPE "public"."match_sessions_status_enum_old" AS ENUM('en_curso', 'finalizada')`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "status" TYPE "public"."match_sessions_status_enum_old" USING "status"::"text"::"public"."match_sessions_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."match_sessions_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."match_sessions_status_enum_old" RENAME TO "match_sessions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "match_sessions" ALTER COLUMN "status" SET DEFAULT 'en_curso'`);
        await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "is_guest"`);
        await queryRunner.query(`DROP TABLE "session_attendees"`);
    }

}
