import { z } from "zod";
import { PHONE_PATTERN, normalizePhone } from "../users/users.service.js";

export const loginBody = z.object({
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(PHONE_PATTERN, "must be 7-15 digits, optionally starting with +")),
  name: z.string().trim().min(1, "is required").max(50),
});
