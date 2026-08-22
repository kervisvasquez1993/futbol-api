import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './domain/entities/player.entity';
import { PlayerRepository } from './domain/ports/player.repository';
import { TypeOrmPlayerRepository } from './infrastructure/repositories/typeorm-player.repository';
import { CreatePlayerUseCase } from './application/use-cases/create-player.use-case';
import { DeletePlayerUseCase } from './application/use-cases/delete-player.use-case';
import { GetPlayerStatsUseCase } from './application/use-cases/get-player-stats.use-case';
import { GetPlayerUseCase } from './application/use-cases/get-player.use-case';
import { ListPlayersUseCase } from './application/use-cases/list-players.use-case';
import { UpdatePlayerUseCase } from './application/use-cases/update-player.use-case';
import { PlayersController } from './presentation/players.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Player])],
  controllers: [PlayersController],
  providers: [
    CreatePlayerUseCase,
    ListPlayersUseCase,
    GetPlayerUseCase,
    UpdatePlayerUseCase,
    DeletePlayerUseCase,
    GetPlayerStatsUseCase,
    { provide: PlayerRepository, useClass: TypeOrmPlayerRepository },
  ],
  exports: [PlayerRepository],
})
export class PlayersModule {}
