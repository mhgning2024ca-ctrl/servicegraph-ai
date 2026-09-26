export interface ApiErrorOptions {
  code: string;
  statusCode: number;
  message: string;
  details?: readonly unknown[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: readonly unknown[];

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? [];
  }
}
