import { isTimeExpired, playedMs } from './match-clock';

const at = (seconds: number) => new Date(seconds * 1000);

const clock = (
  overrides: Partial<Parameters<typeof isTimeExpired>[0]> = {},
) => ({
  startedAt: at(0),
  pausedAt: null,
  pausedSeconds: 0,
  durationMinutes: 10,
  ...overrides,
});

describe('match clock', () => {
  it('sin arrancar no vence', () => {
    expect(isTimeExpired(clock({ startedAt: null }), at(3600))).toBe(false);
  });

  it('sin duración no vence', () => {
    expect(isTimeExpired(clock({ durationMinutes: null }), at(3600))).toBe(
      false,
    );
  });

  it('corriendo vence al cumplir la duración', () => {
    expect(isTimeExpired(clock(), at(599))).toBe(false);
    expect(isTimeExpired(clock(), at(600))).toBe(true);
  });

  it('las pausas terminadas no cuentan como tiempo jugado', () => {
    const match = clock({ pausedSeconds: 120 });
    expect(playedMs(match, at(600))).toBe(480_000);
    expect(isTimeExpired(match, at(600))).toBe(false);
    expect(isTimeExpired(match, at(720))).toBe(true);
  });

  it('pausado se congela y no vence nunca', () => {
    const match = clock({ pausedAt: at(300) });
    expect(playedMs(match, at(5000))).toBe(300_000);
    expect(isTimeExpired(clock({ pausedAt: at(700) }), at(5000))).toBe(false);
  });
});
