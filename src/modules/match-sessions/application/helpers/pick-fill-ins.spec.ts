import { pickFillIns, RandomInt } from './pick-fill-ins';

// Siempre elige el índice 0: con Fisher–Yates deja la lista rotada de forma
// predecible, suficiente para verificar que el orden depende del generador.
const firstIndex: RandomInt = () => 0;
const lastIndex: RandomInt = (max) => max - 1;

describe('pickFillIns', () => {
  it('completa al que entra hasta el tamaño de la jornada', () => {
    const result = pickFillIns({
      size: 6,
      home: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      away: ['c1', 'c2', 'c3', 'c4'],
      donors: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
      fillInCounts: new Map(),
      randomInt: lastIndex,
    });

    expect(result.home).toEqual([]);
    expect(result.away).toHaveLength(2);
    expect(['b1', 'b2', 'b3', 'b4', 'b5', 'b6']).toEqual(
      expect.arrayContaining(result.away),
    );
  });

  it('da prioridad a los que menos veces fueron refuerzo', () => {
    const result = pickFillIns({
      size: 6,
      home: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
      away: ['c1', 'c2', 'c3', 'c4'],
      donors: ['b1', 'b2', 'b3', 'b4'],
      fillInCounts: new Map([
        ['b1', 2],
        ['b2', 1],
        ['b3', 1],
      ]),
      randomInt: firstIndex,
    });

    // b4 (0 veces) primero; después uno de los que tienen 1, nunca b1 (2).
    expect(result.away[0]).toBe('b4');
    expect(['b2', 'b3']).toContain(result.away[1]);
  });

  it('desempata al azar entre los que tienen las mismas veces', () => {
    const input = {
      size: 5,
      home: ['a1', 'a2', 'a3', 'a4', 'a5'],
      away: ['c1', 'c2', 'c3', 'c4'],
      donors: ['b1', 'b2', 'b3'],
      fillInCounts: new Map<string, number>(),
    };

    const withFirst = pickFillIns({ ...input, randomInt: firstIndex });
    const withLast = pickFillIns({ ...input, randomInt: lastIndex });

    expect(withFirst.away).toHaveLength(1);
    expect(withLast.away).toHaveLength(1);
    expect(withFirst.away).not.toEqual(withLast.away);
  });

  it('usa el generador inyectado (no Math.random)', () => {
    const randomInt = jest.fn<number, [number]>(() => 0);
    pickFillIns({
      size: 3,
      home: ['a1', 'a2', 'a3'],
      away: ['c1'],
      donors: ['b1', 'b2', 'b3'],
      fillInCounts: new Map(),
      randomInt,
    });

    expect(randomInt).toHaveBeenCalledWith(3);
    expect(randomInt).toHaveBeenCalledWith(2);
  });

  it('si no alcanzan los donantes completa lo que se puede', () => {
    const result = pickFillIns({
      size: 6,
      home: ['a1', 'a2', 'a3', 'a4'],
      away: ['c1', 'c2', 'c3'],
      donors: ['b1', 'b2'],
      fillInCounts: new Map(),
      randomInt: lastIndex,
    });

    expect(result.away).toHaveLength(2);
    expect(result.home).toEqual([]);
  });

  it('completa al ganador después del que entra', () => {
    const result = pickFillIns({
      size: 5,
      home: ['a1', 'a2', 'a3', 'a4'],
      away: ['c1', 'c2', 'c3'],
      donors: ['b1', 'b2', 'b3', 'b4'],
      fillInCounts: new Map(),
      randomInt: lastIndex,
    });

    expect(result.away).toHaveLength(2);
    expect(result.home).toHaveLength(1);
    expect(new Set([...result.away, ...result.home]).size).toBe(3);
  });

  it('no presta a quien ya juega en alguno de los dos equipos', () => {
    const result = pickFillIns({
      size: 3,
      home: ['a1', 'a2', 'a3'],
      away: ['c1', 'b1'],
      donors: ['b1', 'b2'],
      fillInCounts: new Map(),
      randomInt: lastIndex,
    });

    expect(result.away).toEqual(['b2']);
  });

  it('con equipos completos no presta a nadie', () => {
    const result = pickFillIns({
      size: 2,
      home: ['a1', 'a2'],
      away: ['c1', 'c2'],
      donors: ['b1', 'b2'],
      fillInCounts: new Map(),
      randomInt: lastIndex,
    });

    expect(result).toEqual({ home: [], away: [] });
  });
});
