import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../../players/domain/ports/player.repository';
import { MatchSession } from '../../domain/entities/match-session.entity';
import { MatchSessionRepository } from '../../domain/ports/match-session.repository';
import { AddSessionGuestDto } from '../dtos/add-session-guest.dto';
import { withQueue } from '../helpers/session-response.helper';
import { SessionEventsService } from '../services/session-events.service';

const MIN_GUEST_NAME_LENGTH = 2;

@Injectable()
export class AddSessionGuestUseCase {
  constructor(
    private readonly matchSessionRepository: MatchSessionRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly sessionEventsService: SessionEventsService,
  ) {}

  async execute(sessionId: string, dto: AddSessionGuestDto) {
    const name = dto.name.trim();

    if (name.length < MIN_GUEST_NAME_LENGTH) {
      throw new ValidationError('El nombre del invitado es obligatorio');
    }

    // Vale en cualquier estado: con la jornada en curso o terminada el admin
    // lo ubica en un equipo después con PUT /match-sessions/:id/teams.
    const session = await this.matchSessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundError('Jornada no encontrada');
    }

    const nameTaken = session.attendees.some(
      (attendee) =>
        attendee.player.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (nameTaken) {
      throw new ValidationError(
        'Ya existe un invitado con ese nombre en la jornada',
      );
    }

    // El invitado es un Player sin usuario para poder jugar, hacer goles y
    // salir en el historial como cualquiera.
    const guest = await this.playerRepository.create({ name, isGuest: true });
    await this.matchSessionRepository.addAttendee(sessionId, guest.id);
    this.sessionEventsService.emit(sessionId);

    const updatedSession = (await this.matchSessionRepository.findById(
      sessionId,
    )) as MatchSession;
    return withQueue(updatedSession);
  }
}
