export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, public details?: unknown) {
    super(message);
  }
}

export class NotFoundError extends CustomError {
  constructor(public resource: string, public resourceId?: string) {
    super(`${resource} not found`);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message = 'Admin access required') {
    super(message);
  }
}
