"use client";

import { useState, useTransition } from "react";
import { savePaymentConfig, testMpCredentials } from "./actions";
import { CheckCircle, Copy, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type DonationMode = "TRUST" | "PIX_PROOF" | "MERCADO_PAGO";

const MODES: { value: DonationMode; label: string; description: string }[] = [
  {
    value: "TRUST",
    label: "Confiança",
    description: "Convidado promete enviar PIX diretamente. Você confia e marca como recebido.",
  },
  {
    value: "PIX_PROOF",
    label: "PIX + Comprovante",
    description: "Convidado envia foto do comprovante. Você aprova manualmente após confirmar o depósito.",
  },
  {
    value: "MERCADO_PAGO",
    label: "Mercado Pago",
    description: "Pagamento via cartão ou PIX instantâneo. Aprovação automática, sem trabalho manual.",
  },
];

interface Props {
  eventId: string;
  currentMode: DonationMode;
  currentPixKey: string;
  currentWebhookSecret: string;
  hasMpConfigured: boolean;
  canEncrypt: boolean;
  appUrl: string;
}

export function PagamentosClient({
  eventId,
  currentMode,
  currentPixKey,
  currentWebhookSecret,
  hasMpConfigured,
  canEncrypt,
  appUrl,
}: Props) {
  const [mode, setMode] = useState<DonationMode>(currentMode);
  const [pixKey, setPixKey] = useState(currentPixKey);
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [webhookSecret] = useState(currentWebhookSecret);
  const [showTutorial, setShowTutorial] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTestTransition] = useTransition();

  const webhookUrl = `${appUrl}/api/webhooks/mercadopago`;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("donationMode", mode);
      if (pixKey) fd.set("pixKey", pixKey);
      if (mpPublicKey) fd.set("mpPublicKey", mpPublicKey);
      if (mpAccessToken) fd.set("mpAccessToken", mpAccessToken);
      const result = await savePaymentConfig(fd);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      } else {
        setSaveError(result.error);
      }
    });
  }

  function handleTest() {
    setTestResult(null);
    startTestTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("mpAccessToken", mpAccessToken);
      const result = await testMpCredentials(fd);
      setTestResult(
        result.ok
          ? { ok: true, message: "Conexão bem-sucedida! Credenciais válidas." }
          : { ok: false, message: result.error }
      );
    });
  }

  async function copySecret() {
    await navigator.clipboard.writeText(webhookSecret).catch(() => null);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Mode selection */}
      <section className="flex flex-col gap-2">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
              mode === m.value ? "border-primary bg-primary/5" : "hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              name="donationMode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </div>
          </label>
        ))}
      </section>

      {/* PIX key (shown for TRUST and PIX_PROOF) */}
      {mode !== "MERCADO_PAGO" && (
        <div>
          <label className="text-sm font-medium block mb-1">Chave PIX</label>
          <input
            type="text"
            value={pixKey}
            onChange={(e) => setPixKey(e.target.value)}
            placeholder="CPF, email, telefone ou chave aleatória"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Exibida para os convidados durante o processo de presente.
          </p>
        </div>
      )}

      {/* Mercado Pago config */}
      {mode === "MERCADO_PAGO" && (
        <div className="flex flex-col gap-4 rounded-lg border p-4 bg-muted/20">
          <div className="flex items-start gap-2">
            {hasMpConfigured
              ? <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
              : <span className="w-4 h-4 rounded-full border-2 border-muted-foreground mt-0.5 shrink-0" />
            }
            <p className="text-sm font-semibold">
              {hasMpConfigured ? "Mercado Pago configurado" : "Configurar Mercado Pago"}
            </p>
          </div>

          {!canEncrypt && (
            <div className="rounded-md bg-destructive/10 text-destructive text-xs p-3">
              <strong>ENCRYPTION_KEY não configurada.</strong> Para salvar credentials, adicione a variável de ambiente no Railway:
              <code className="block mt-1 font-mono">ENCRYPTION_KEY=&lt;64 hex chars&gt;</code>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Public Key</label>
            <input
              type="password"
              value={mpPublicKey}
              onChange={(e) => setMpPublicKey(e.target.value)}
              placeholder={hasMpConfigured ? "••••• (deixe em branco para não alterar)" : "APP_USR-..."}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Access Token</label>
            <input
              type="password"
              value={mpAccessToken}
              onChange={(e) => setMpAccessToken(e.target.value)}
              placeholder={hasMpConfigured ? "••••• (deixe em branco para não alterar)" : "APP_USR-..."}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Webhook Secret (somente leitura)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookSecret || "Salve primeiro para gerar o secret"}
                className="h-9 flex-1 rounded-md border border-input bg-muted px-3 text-xs font-mono"
              />
              <button
                type="button"
                onClick={copySecret}
                className="h-9 px-3 rounded-md border text-xs hover:bg-muted flex items-center gap-1.5"
              >
                {copiedSecret ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copiedSecret ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">URL do Webhook</label>
            <div className="flex gap-2 items-center">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">{webhookUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhookUrl).catch(() => null)}
                className="h-7 px-2 rounded border text-xs hover:bg-muted shrink-0"
              >
                <Copy size={11} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure esta URL no painel do Mercado Pago → Sua aplicação → Webhooks.
            </p>
          </div>

          {mpAccessToken && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !mpAccessToken}
                className="rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {isTesting ? "Testando…" : "Testar conexão"}
              </button>
              {testResult && (
                <span className={`text-xs ${testResult.ok ? "text-green-600" : "text-destructive"}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Suas credenciais são criptografadas com AES-256-GCM antes de serem salvas no banco.
          </p>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar configuração"}
        </button>
        {saved && <span className="text-sm text-green-600">Salvo!</span>}
        {saveError && <span className="text-sm text-destructive">{saveError}</span>}
      </div>

      {/* Tutorial collapsible */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTutorial((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/40 text-left"
        >
          <span>Como obter suas credenciais Mercado Pago</span>
          {showTutorial ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showTutorial && (
          <div className="px-4 pb-4 pt-2 border-t text-sm text-muted-foreground flex flex-col gap-2">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Acesse{" "}
                <a
                  href="https://www.mercadopago.com.br/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
                >
                  developers.mercadopago.com.br <ExternalLink size={11} />
                </a>
              </li>
              <li>Faça login com sua conta Mercado Pago</li>
              <li>Clique em <strong>Criar aplicação</strong> e dê um nome (ex: &quot;Casamento - Ana e Carlos&quot;)</li>
              <li>Navegue para <strong>Credenciais de produção</strong></li>
              <li>Copie a <strong>Public Key</strong> e o <strong>Access Token</strong></li>
              <li>Cole os valores nos campos acima e clique em <strong>Testar conexão</strong></li>
              <li>
                No painel da aplicação, vá em <strong>Webhooks</strong> e adicione a URL:
                <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs break-all">{webhookUrl}</code>
              </li>
              <li>Em <strong>Eventos</strong>, selecione <em>Pagamentos</em></li>
              <li>Cole o <strong>Webhook Secret</strong> (gerado acima) no campo <em>Secret</em> do painel MP</li>
              <li>Clique em <strong>Salvar configuração</strong></li>
            </ol>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs space-y-1">
              <p className="font-semibold">Modo Sandbox (testes)</p>
              <p>Para testar sem cobranças reais, use as credenciais de <em>Teste</em> (aba separada no painel MP).</p>
              <p>
                Troque pelas credenciais de <em>Produção</em> apenas quando o casamento estiver próximo e você
                quiser receber pagamentos reais.
              </p>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
