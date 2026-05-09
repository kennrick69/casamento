export async function register() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl || appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
    throw new Error(
      `[startup] NEXT_PUBLIC_APP_URL inválida ou ausente: "${appUrl}". ` +
        "Configure a variável no Railway antes de fazer deploy."
    );
  }

  if (!process.env.SENTRY_DSN) return;

  const { init } = await import("@sentry/nextjs");

  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.cookies) event.request.cookies = {};
      if (event.request?.headers) {
        const h = event.request.headers;
        delete h["authorization"];
        delete h["cookie"];
        delete h["x-cron-secret"];
      }
      return event;
    },
  });
}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Headers },
  context: { routerKind: string; routeType: string; routePath: string }
) {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  // Convert Headers to plain object as required by Sentry's RequestInfo type
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => { headers[k] = v; });
  captureRequestError(error, { ...request, headers }, context);
}
