export interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  send(opts: SendEmailOpts): Promise<{ id: string }>;
}
