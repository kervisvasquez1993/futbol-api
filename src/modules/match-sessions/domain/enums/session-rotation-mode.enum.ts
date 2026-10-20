export enum SessionRotationMode {
  MANUAL = 'manual',
  WINNER_STAYS = 'winner_stays',
  // "Quem ganha fica + banco": 2 equipos en cancha, el resto en el banco y la
  // rotación es por jugador (ver helpers/bench-rotation.ts).
  BENCH_ROTATION = 'bench_rotation',
}
