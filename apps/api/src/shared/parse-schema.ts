import { type ZodType } from "zod";

import { ApiError } from "./api-error.js";

export function parseSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw new ApiError({
    code: "VALIDATION_ERROR",
    statusCode: 400,
    message: "Request validation failed.",
    details: result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}
