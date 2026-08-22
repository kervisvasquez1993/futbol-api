import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/user.entity';
import { UserRepository } from './domain/ports/user.repository';
import { TypeOrmUserRepository } from './infrastructure/repositories/typeorm-user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { GetMeUseCase } from './application/use-cases/get-me.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    GetMeUseCase,
    ListUsersUseCase,
    CreateUserUseCase,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
  ],
  exports: [UserRepository],
})
export class UsersModule {}
