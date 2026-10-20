import { MatchTeamSide } from '../../../matches/domain/enums/match-team-side.enum';

// Rotación "Quem ganha fica + banco". Es una copia exacta de
// src/domain/match-sessions/services/bench-rotation.ts del front: la vista
// previa ("entram / descansam na próxima") usa el mismo código, por eso no hay
// azar. Si se cambia algo acá, hay que cambiarlo allá también.

// Máximo de rondas seguidas en cancha: a la siguiente descansa (si hay quien
// lo reemplace).
export const MAX_CONSECUTIVE_ROUNDS = 2;

export interface RotationRound {
  home: string[];
  away: string[];
}

export interface RotationInput {
  teamSize: number;
  // Rondas de la jornada en orden; la última es la que termina.
  rounds: RotationRound[];
  // Vinieron y no están en ninguno de los 2 equipos.
  bench: string[];
  // Orden de llegada (attendees por fecha): desempata cuando todo lo demás
  // es igual.
  arrivalOrder: string[];
}

export interface NextLineup {
  // Lado del ganador: los que siguen + los que lo completan.
  winners: string[];
  // El equipo que entra: primero el banco, después los del perdedor que
  // menos jugaron.
  challengers: string[];
  // Quedan afuera para la siguiente.
  bench: string[];
}

const playedIn = (round: RotationRound, id: string) =>
  round.home.includes(id) || round.away.includes(id);

// Rondas seguidas que jugó, contando desde la última hacia atrás.
export const consecutiveRounds = (
  rounds: RotationRound[],
  id: string,
): number => {
  let streak = 0;
  for (let i = rounds.length - 1; i >= 0 && playedIn(rounds[i], id); i--) {
    streak++;
  }
  return streak;
};

// Prioridad para entrar (el primero entra antes): menos rondas jugadas, más
// tiempo esperando (última ronda jugada más vieja; nunca = -1), llegó antes,
// id.
export const byPriority = ({
  rounds,
  arrivalOrder,
}: Pick<RotationInput, 'rounds' | 'arrivalOrder'>) => {
  const played = (id: string) =>
    rounds.filter((round) => playedIn(round, id)).length;
  const lastPlayed = (id: string) => {
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (playedIn(rounds[i], id)) return i;
    }
    return -1;
  };
  const arrival = (id: string) => {
    const index = arrivalOrder.indexOf(id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return (a: string, b: string) =>
    played(a) - played(b) ||
    lastPlayed(a) - lastPlayed(b) ||
    arrival(a) - arrival(b) ||
    a.localeCompare(b);
};

// Próxima ronda tras ganar `winnerSide`:
// 1. Del ganador siguen los que no llegaron a MAX_CONSECUTIVE_ROUNDS seguidas.
// 2. El resto de los lugares se llena en este orden: el banco (por
//    prioridad), los del perdedor (los que menos jugaron) y, solo si todavía
//    falta gente, los del ganador que debían descansar.
// 3. Los primeros `teamSize` de esa lista son el equipo que entra; los
//    siguientes completan al ganador.
export const nextLineup = (
  input: RotationInput,
  winnerSide: MatchTeamSide,
): NextLineup => {
  const last = input.rounds.at(-1) ?? { home: [], away: [] };
  const winners = winnerSide === MatchTeamSide.HOME ? last.home : last.away;
  const losers = winnerSide === MatchTeamSide.HOME ? last.away : last.home;
  const sort = byPriority(input);
  const tired = (id: string) =>
    consecutiveRounds(input.rounds, id) >= MAX_CONSECUTIVE_ROUNDS;

  const everyone = [...new Set([...winners, ...losers, ...input.bench])];
  const slots = Math.min(input.teamSize * 2, everyone.length);
  const keep = winners
    .filter((id) => !tired(id))
    .slice(0, Math.min(input.teamSize, slots));
  const fill = [
    ...[...input.bench].sort(sort),
    ...[...losers].sort(sort),
    ...winners.filter(tired).sort(sort),
  ].slice(0, slots - keep.length);

  const challengerCount = Math.min(input.teamSize, slots - keep.length);
  const challengers = fill.slice(0, challengerCount);
  const winnersNext = [...keep, ...fill.slice(challengerCount)];
  const playing = new Set([...winnersNext, ...challengers]);
  return {
    winners: winnersNext,
    challengers,
    bench: everyone.filter((id) => !playing.has(id)).sort(sort),
  };
};
