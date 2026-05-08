import type { EmailProvider, SendEmailOpts } from "./types";

// Usado em desenvolvimento quando RESEND_API_KEY não está configurada.
export class ConsoleEmailProvider implements EmailProvider {
  async send(opts: SendEmailOpts) {
    const id = `dev-${Date.now()}`;

    const border = "═".repeat(64);
    const verifyLinkMatch = opts.html.match(/href="([^"]*\/api\/auth\/verify[^"]*)"/);
    const isRsvpConfirm = opts.subject.startsWith("Presença confirmada");

    if (verifyLinkMatch) {
      console.log(`\n${border}`);
      console.log("📬  [DEV] EMAIL DE VERIFICAÇÃO — clique no link abaixo");
      console.log(border);
      console.log(`Para:     ${opts.to}`);
      console.log(`Assunto:  ${opts.subject}`);
      console.log(`\n🔗  ${verifyLinkMatch[1]}\n`);
      console.log(border + "\n");
    } else if (isRsvpConfirm) {
      const eventLinkMatch = opts.html.match(/href="([^"]*)"[^>]*>Ver meu convite/);
      const editLinkMatch = opts.html.match(/href="([^"]*\/rsvp[^"]*)"/);
      console.log(`\n${border}`);
      console.log("✅  [DEV] EMAIL DE CONFIRMAÇÃO DE PRESENÇA");
      console.log(border);
      console.log(`Para:     ${opts.to}`);
      console.log(`Assunto:  ${opts.subject}`);
      if (eventLinkMatch) console.log(`Convite:  ${eventLinkMatch[1]}`);
      if (editLinkMatch) console.log(`Editar:   ${editLinkMatch[1]}`);
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
