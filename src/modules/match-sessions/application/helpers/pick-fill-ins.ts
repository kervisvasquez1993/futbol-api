// Devuelve un entero en [0, maxExclusive). Se inyecta para poder testear el sorteo.
export type RandomInt = (maxExclusive: number) => number;

export interface PickFillInsInput {
  size: number;
  home: string[];
  away: string[];
  donors: string[];
  // Veces que cada jugador ya fue refuerzo en esta jornada (ausente = 0).
  fillInCounts: Map<string, number>;
  randomInt: RandomInt;
}

export interface PickedFillIns {
  home: string[];
  away: string[];
}

// Completa hasta `size` primero al que entra (away) y después al ganador
// (home, por si alguien se fue). Tienen prioridad los donantes que menos veces
// fueron refuerzo; entre los empatados decide el azar. Si no alcanzan, se
// completa lo que se pueda.
export function pickFillIns({
  size,
  home,
  away,
  donors,
  fillInCounts,
  randomInt,
}: PickFillInsInput): PickedFillIns {
  const taken = new Set([...home, ...away]);
  const candidates = shuffle(
    donors.filter((playerId) => !taken.has(playerId)),
    randomInt,
  );
  // sort es estable: después de mezclar, los empatados quedan en orden al azar.
  candidates.sort(
    (a, b) => (fillInCounts.get(a) ?? 0) - (fillInCounts.get(b) ?? 0),
  );

  const take = (current: number) =>
    candidates.splice(0, Math.max(size - current, 0));

  const awayFillIns = take(away.length);
  const homeFillIns = take(home.length);
  return { home: homeFillIns, away: awayFillIns };
}

function shuffle<T>(items: T[], randomInt: RandomInt): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
