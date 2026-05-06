import type { EmailProvider } from "./types";
import { ResendProvider } from "./resend";
import { ConsoleEmailProvider } from "./console";

export const email: EmailProvider =
  process.env.RESEND_API_KEY
    ? new ResendProvider()
    : new ConsoleEmailProvider();

export type { EmailProvider, SendEmailOpts } from "./types";
