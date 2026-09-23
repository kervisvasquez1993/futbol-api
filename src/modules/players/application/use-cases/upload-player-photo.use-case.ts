import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { NotFoundError } from '../../../../shared/errors/domain-errors';
import { S3Service } from '../../../../shared/storage/s3.service';
import { PlayerRepository } from '../../domain/ports/player.repository';
import { assertCanEditPlayer } from '../helpers/assert-can-edit-player';

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadPlayerPhotoUseCase {
  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    id: string,
    file: Express.Multer.File,
    currentUser: CurrentUserPayload,
  ) {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    assertCanEditPlayer(currentUser, id);

    const imageUrl = await this.s3Service.uploadPublicFile({
      buffer: file.buffer,
      contentType: file.mimetype,
      keyPrefix: 'player-photos',
      extension: EXTENSION_BY_MIME_TYPE[file.mimetype] ?? 'jpg',
    });

    return this.playerRepository.update(id, { imageUrl });
  }
}
