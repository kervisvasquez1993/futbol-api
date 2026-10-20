export enum GoalStatus {
  // Cargado por un member con el partido terminado: no suma al ranking hasta
  // que lo apruebe un admin.
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
}
