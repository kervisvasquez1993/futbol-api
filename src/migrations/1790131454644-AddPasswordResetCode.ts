import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetCode1790131454644 implements MigrationInterface {
    name = 'AddPasswordResetCode1790131454644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_code_hash" text`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_code_expires_at" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_code_expires_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_code_hash"`);
    }

}
