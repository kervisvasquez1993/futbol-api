export abstract class DomainError extends Error {
  abstract readonly errors?: string[];

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly errors?: string[];

  constructor(message = 'Recurso no encontrado') {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly errors?: string[];

  constructor(message = 'Conflicto con el estado actual del recurso') {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  readonly errors?: string[];

  constructor(message = 'No autorizado') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly errors?: string[];

  constructor(message = 'Acceso prohibido') {
    super(message);
  }
}

export class ValidationError extends DomainError {
  readonly errors?: string[];

  constructor(message = 'Datos inválidos', errors?: string[]) {
    super(message);
    this.errors = errors;
  }
}
