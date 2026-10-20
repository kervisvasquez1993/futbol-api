import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/errors/domain-errors';
import { PlayerRepository } from '../../domain/ports/player.repository';

// Convidado repetido ("Pedro" creado dos veces): pasa todo su historial
// (rondas, goles, asistencia, cargas manuales) al otro jugador y lo borra, así
// las estadísticas quedan en uno solo. Solo se une un convidado sin cuenta;
// el destino puede ser otro convidado o un jugador registrado.
@Injectable()
export class MergePlayerUseCase {
  constructor(private readonly playerRepository: PlayerRepository) {}

  async execute(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new ValidationError('No se puede unir un jugador consigo mismo');
    }

    const source = await this.playerRepository.findById(sourceId);
    if (!source) {
      throw new NotFoundError('Jugador no encontrado');
    }

    const target = await this.playerRepository.findById(targetId);
    if (!target) {
      throw new NotFoundError('Jugador destino no encontrado');
    }

    if (!source.isGuest || (await this.playerRepository.isClaimed(sourceId))) {
      throw new ValidationError('Solo se puede unir un convidado');
    }

    await this.playerRepository.mergeInto(sourceId, targetId);
    return target;
  }
}
