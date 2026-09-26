import { z } from "zod";

import { UtcTimestampSchema, UuidSchema } from "./common.js";

export const CustomerCommunicationSchema = z.object({
  id: UuidSchema,
  incidentId: UuidSchema,
  createdAt: UtcTimestampSchema,
  audience: z.enum(["AFFECTED_USERS", "PUBLIC"]),
  language: z.enum(["en", "fr"]),
  text: z.string(),
  voiceAssetId: z.string().nullable(),
  state: z.enum(["DRAFT", "READY", "SENT", "FAILED"]),
});
export type CustomerCommunication = z.infer<typeof CustomerCommunicationSchema>;
