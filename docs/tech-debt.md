# Dívidas Técnicas

Documentação viva. Atualizar ao criar dívida nova ou pagar dívida existente.

---

## 🔴 ALTA — Migrar storage para Cloudflare R2

**Status:** Ativo — em uso o volume persistente do Railway.

**Gatilho de migração:** o que vier primeiro:
- 100 fotos no sistema
- 30 dias antes do evento

**Risco:** volume Railway não é CDN, custo de egress pode subir, e não há redundância automática.

**Como migrar:**
1. Criar bucket R2 na Cloudflare
2. Implementar `src/lib/storage/cloudflare-r2.ts` implementando `StorageProvider`
3. **Ligar leitura de `STORAGE_PROVIDER` em `src/lib/storage/index.ts`** — hoje o código ignora essa variável e usa `RailwayVolumeStorage` hardcoded; ao migrar, mudar para: `process.env.STORAGE_PROVIDER === "r2" ? new CloudflareR2Storage() : new RailwayVolumeStorage()`
4. Definir `STORAGE_PROVIDER=r2` nas env vars do Railway (variável já documentada em `.env.example`)
5. Migrar fotos existentes do volume para o R2 com script
6. Remover `RailwayVolumeStorage` após validar

**Camada de abstração:** `StorageProvider` em `src/lib/storage/types.ts` — a troca de implementação não requer mudanças fora de `src/lib/storage/`.

---

## 🟡 MÉDIA — Gateway de pagamento real (Modo 3 de doação)

**Status:** Stub implementado em `/api/webhooks/payment/route.ts` e `DonationMode.GATEWAY` no schema.

**O que falta:** integrar Stripe, Pagar.me ou MercadoPago, processar webhook, confirmar doação automaticamente.

**Impacto:** baixo para o casamento próprio (modos TRUST e PIX_PROOF cobrem o caso de uso).

---

## 🟡 MÉDIA — Lembretes via WhatsApp

**Status:** não iniciado.

**O que falta:** integrar Twilio ou WhatsApp Business API, criar templates de mensagem aprovados pelo Meta.

**Alternativa atual:** lembretes por email via Resend (implementar na Fase 5).

---

## ✅ Concluídas

*(Mover itens aqui quando pagos, com data.)*
