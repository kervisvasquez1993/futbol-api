import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../../shared/decorators/current-user.decorator';
import { CreatePlayerDto } from '../application/dtos/create-player.dto';
import { UpdatePlayerDto } from '../application/dtos/update-player.dto';
import { CreatePlayerUseCase } from '../application/use-cases/create-player.use-case';
import { DeletePlayerUseCase } from '../application/use-cases/delete-player.use-case';
import { GetPlayerStatsUseCase } from '../application/use-cases/get-player-stats.use-case';
import { GetPlayerUseCase } from '../application/use-cases/get-player.use-case';
import { ListPlayersUseCase } from '../application/use-cases/list-players.use-case';
import { UpdatePlayerUseCase } from '../application/use-cases/update-player.use-case';
import { UploadPlayerPhotoUseCase } from '../application/use-cases/upload-player-photo.use-case';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('players')
export class PlayersController {
  constructor(
    private readonly createPlayerUseCase: CreatePlayerUseCase,
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly getPlayerUseCase: GetPlayerUseCase,
    private readonly updatePlayerUseCase: UpdatePlayerUseCase,
    private readonly deletePlayerUseCase: DeletePlayerUseCase,
    private readonly getPlayerStatsUseCase: GetPlayerStatsUseCase,
    private readonly uploadPlayerPhotoUseCase: UploadPlayerPhotoUseCase,
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.updatePlayerUseCase.execute(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.uploadPlayerPhotoUseCase.execute(id, file, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.deletePlayerUseCase.execute(id);
  }
}
