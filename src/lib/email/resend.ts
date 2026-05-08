import { Resend } from "resend";
import type { EmailProvider, SendEmailOpts } from "./types";

export class ResendProvider implements EmailProvider {
  private client: Resend;
  private from: string;

  constructor(
    apiKey = process.env.RESEND_API_KEY ?? "",
    from = process.env.EMAIL_FROM ?? "noreply@example.com"
  ) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(opts: SendEmailOpts) {
    const extraHeaders: Record<string, string> = { ...opts.headers };
    if (opts.idempotencyKey) extraHeaders["Idempotency-Key"] = opts.idempotencyKey;

    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
    });
    if (error) throw new Error(`Email send failed: ${error.message}`);
    return { id: data!.id };
  }
}
