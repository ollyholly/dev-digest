/**
 * Domain error taxonomy + structured API error envelope. The UX taxonomy
 * (toast/inline/full-screen) is the frontend's concern; the API returns a
 * stable structured body (ApiErrorBody): { error: { code, message, details } }.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super('not_found', message, 404, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super('validation_error', message, 422, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, details?: unknown) {
    super('external_service_error', message, 502, details);
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: unknown) {
    super('config_error', message, 500, details);
  }
}

/** Provider secret missing — distinct from other config errors for typed handling. */
export class MissingApiKeyError extends AppError {
  constructor(public readonly keyName: string) {
    super('missing_api_key', `${keyName} is not configured`, 500, { key: keyName });
    this.name = 'MissingApiKeyError';
  }
}

export function isMissingApiKeyError(err: unknown): err is MissingApiKeyError {
  return err instanceof MissingApiKeyError || (err instanceof AppError && err.code === 'missing_api_key');
}
