import * as z from "zod";

export const ThreadValidation = z.object({
  tred: z.string().min(3, { message: "Minimum 3 characters." }),
  accountId: z.string(),
});
