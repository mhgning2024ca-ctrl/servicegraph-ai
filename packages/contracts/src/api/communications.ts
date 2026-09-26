import { z } from "zod";

import { CustomerCommunicationSchema } from "../domain/communication.js";

export const CreateCommunicationRequestSchema = z.object({
  audience: z.enum(["AFFECTED_USERS", "PUBLIC"]),
  language: z.enum(["en", "fr"]),
  text: z.string().min(1),
});
export type CreateCommunicationRequest = z.infer<typeof CreateCommunicationRequestSchema>;

export const CreateCommunicationResponseSchema = z.object({
  communication: CustomerCommunicationSchema,
});
export type CreateCommunicationResponse = z.infer<typeof CreateCommunicationResponseSchema>;
