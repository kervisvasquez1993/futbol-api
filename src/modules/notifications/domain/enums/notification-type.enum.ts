export enum NotificationType {
  // A los admins: un jugador cargó (o editó) sus goles/asistencias a mano.
  MANUAL_STATS_SUBMITTED = 'manual_stats_submitted',
  // Al jugador: un admin aprobó su carga.
  MANUAL_STATS_APPROVED = 'manual_stats_approved',
  // Al jugador: un admin borró su carga.
  MANUAL_STATS_REJECTED = 'manual_stats_rejected',
  // Al jugador: un admin cargó o corrigió sus números (quedan aprobados).
  MANUAL_STATS_SET_BY_ADMIN = 'manual_stats_set_by_admin',
  // A los admins: un jugador cargó un gol/asistencia en un partido terminado.
  GOAL_SUBMITTED = 'goal_submitted',
  // A quien lo cargó: un admin aprobó el gol.
  GOAL_APPROVED = 'goal_approved',
  // A quien lo cargó: un admin borró el gol pendiente.
  GOAL_REJECTED = 'goal_rejected',
}
