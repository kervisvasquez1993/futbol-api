import { Injectable } from '@nestjs/common';
import { PlayerRepository } from '../../domain/ports/player.repository';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { CurrentUserPayload } from '../../../../shared/decorators/current-user.decorator';
import { assertCanEditPlayer } from '../helpers/assert-can-edit-player';
import { UpdatePlayerDto } from '../dtos/update-player.dto';

const MIN_AGE = 5;
const MAX_AGE = 100;

@Injectable()
export class UpdatePlayerUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(
    id: string,
    dto: UpdatePlayerDto,
    currentUser: CurrentUserPayload,
  ) {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new NotFoundError('Jugador no encontrado');
    }

    assertCanEditPlayer(currentUser, id);

    if (dto.birthDate) {
      this.assertValidBirthDate(dto.birthDate);
    }

    return this.playerRepository.update(id, dto);
  }

  private assertValidBirthDate(birthDate: string): void {
    const parsed = new Date(`${birthDate}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('La fecha de nacimiento no es válida');
    }

    const now = new Date();

    if (parsed.getTime() > now.getTime()) {
      throw new ValidationError('La fecha de nacimiento no es válida');
    }

    const ageInYears =
      (now.getTime() - parsed.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (ageInYears < MIN_AGE || ageInYears > MAX_AGE) {
      throw new ValidationError('La fecha de nacimiento no es válida');
    }
  }
}
