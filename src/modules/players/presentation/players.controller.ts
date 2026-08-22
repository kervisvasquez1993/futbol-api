import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreatePlayerDto } from '../application/dtos/create-player.dto';
import { UpdatePlayerDto } from '../application/dtos/update-player.dto';
import { CreatePlayerUseCase } from '../application/use-cases/create-player.use-case';
import { DeletePlayerUseCase } from '../application/use-cases/delete-player.use-case';
import { GetPlayerStatsUseCase } from '../application/use-cases/get-player-stats.use-case';
import { GetPlayerUseCase } from '../application/use-cases/get-player.use-case';
import { ListPlayersUseCase } from '../application/use-cases/list-players.use-case';
import { UpdatePlayerUseCase } from '../application/use-cases/update-player.use-case';

@Controller('players')
export class PlayersController {
  constructor(
    private readonly createPlayerUseCase: CreatePlayerUseCase,
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly getPlayerUseCase: GetPlayerUseCase,
    private readonly updatePlayerUseCase: UpdatePlayerUseCase,
    private readonly deletePlayerUseCase: DeletePlayerUseCase,
    private readonly getPlayerStatsUseCase: GetPlayerStatsUseCase,
  ) {}

  @Get()
  list() {
    return this.listPlayersUseCase.execute();
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.getPlayerStatsUseCase.execute(id);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getPlayerUseCase.execute(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.createPlayerUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.updatePlayerUseCase.execute(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.deletePlayerUseCase.execute(id);
  }
}
