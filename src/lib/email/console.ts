import type { EmailProvider, SendEmailOpts } from "./types";

// Usado em desenvolvimento quando RESEND_API_KEY não está configurada.
export class ConsoleEmailProvider implements EmailProvider {
  async send(opts: SendEmailOpts) {
    const id = `dev-${Date.now()}`;

    const linkMatch = opts.html.match(/href="([^"]*\/api\/auth\/verify[^"]*)"/);

    if (linkMatch) {
      const border = "═".repeat(64);
      console.log(`\n${border}`);
      console.log("📬  [DEV] EMAIL DE VERIFICAÇÃO — clique no link abaixo");
      console.log(border);
      console.log(`Para:     ${opts.to}`);
      console.log(`Assunto:  ${opts.subject}`);
      console.log(`\n🔗  ${linkMatch[1]}\n`);
      console.log(border + "\n");
    } else {
      console.log("\n📧 [DEV EMAIL]", {
        to: opts.to,
        subject: opts.subject,
        idempotencyKey: opts.idempotencyKey,
        id,
      });
    }

    return { id };
  }
}
