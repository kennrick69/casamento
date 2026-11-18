import type { EmailProvider } from "./types";
import { ResendProvider } from "./resend";
import { ConsoleEmailProvider } from "./console";
import { withUndeliverableGuard } from "./guard";

const baseProvider: EmailProvider =
  process.env.RESEND_API_KEY
    ? new ResendProvider()
    : new ConsoleEmailProvider();

// Todo envio passa pela trava de endereços não-entregáveis (.invalid):
// visitantes do modo jogo e removidos por LGPD nunca recebem e-mail.
export const email: EmailProvider = withUndeliverableGuard(baseProvider);

export type { EmailProvider, SendEmailOpts } from "./types";
