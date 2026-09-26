export type AuthErrorCode =
  | "AUTH_MISSING_TOKEN"
  | "AUTH_INVALID_TOKEN"
  | "AUTH_INVALID_CLAIMS"
  | "AUTH_FORBIDDEN"
  | "AUTH_CONFIGURATION_ERROR";

export class AuthError extends Error {
  readonly statusCode: 401 | 403 | 503;
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, statusCode: 401 | 403 | 503, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
