import type { EmailProvider, SendEmailOpts } from "./types";

// Usado em desenvolvimento quando RESEND_API_KEY não está configurada.
export class ConsoleEmailProvider implements EmailProvider {
  async send(opts: SendEmailOpts) {
    const id = `dev-${Date.now()}`;
    console.log("\n📧 [DEV EMAIL]", {
      to: opts.to,
      subject: opts.subject,
      idempotencyKey: opts.idempotencyKey,
      id,
    });
    return { id };
  }
}
