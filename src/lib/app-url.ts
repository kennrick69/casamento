/**
 * Retorna NEXT_PUBLIC_APP_URL sem barra final.
 * Lança erro explícito se a variável não estiver configurada —
 * prevenindo que links de email, QR codes ou redirects apontem
 * para localhost em produção.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL não está configurada. " +
        "Defina essa variável de ambiente no Railway antes de iniciar o servidor."
    );
  }
  return url.replace(/\/$/, "");
}
