# Política de Privacidade — Voem.

**Versão:** 1.0  
**Data de vigência:** 2026-05-08  

> **TODO (antes de virar produto comercial):** Este documento é um placeholder de desenvolvimento.
> Deve ser revisado por advogado especializado em LGPD antes do lançamento comercial.
> Pontos pendentes: DPO obrigatório (verificar porte), relatório de impacto (RIPD),
> prazo exato de retenção de audit logs, e mapeamento completo de suboperadores.

---

## 1. Dados que coletamos

Ao usar o Voem., coletamos os seguintes dados pessoais:

**Dados de cadastro (organizadores):**
- Nome e sobrenome
- Endereço de e-mail
- Telefone (opcional)
- Senha (armazenada em hash irreversível — nunca em texto puro)

**Dados do evento:**
- Nomes do casal, data e local da cerimônia e recepção
- Roteiro detalhado do evento
- Lista de presentes e URLs externos de loja

**Dados dos convidados (via RSVP):**
- Nome
- Confirmação de presença e número de acompanhantes
- Restrições alimentares e necessidades de acessibilidade (quando informadas)
- Mensagens enviadas ao mural e chat do evento
- Declarações de intenção de doação (valor e forma de pagamento)

**Dados técnicos:**
- Endereço IP (usado para rate limiting e logs de segurança)
- Logs de autenticação: tentativas de login, trocas de senha, tokens de verificação
- Data e hora de acesso às páginas administrativas

---

## 2. Para que usamos esses dados

| Finalidade | Dados usados |
|---|---|
| Operação da plataforma e do evento | Cadastro, evento, RSVP |
| Autenticação e segurança da conta | E-mail, senha (hash), IP, audit logs |
| Comunicação por e-mail (confirmações, notificações) | E-mail |
| Moderação de conteúdo do mural e chat | Mensagens, nome do convidado |
| Suporte ao organizador | Dados de cadastro |
| Logs de auditoria (detecção de fraude e debug) | IP, audit logs |

Não usamos seus dados para publicidade de terceiros ou venda de perfis.

---

## 3. Bases legais (LGPD — Lei 13.709/2018)

- **Execução de contrato** (Art. 7°, V): dados necessários para criar e gerenciar o evento
- **Consentimento** (Art. 7°, I): fotos e mídias enviadas ao mural; aceite de marketing opcional
- **Legítimo interesse** (Art. 7°, IX): logs de auditoria e segurança para proteção da plataforma e dos usuários
- **Cumprimento de obrigação legal** (Art. 7°, II): quando exigido por autoridade competente

---

## 4. Compartilhamento com terceiros

Compartilhamos dados **apenas** com os seguintes prestadores de serviço, na qualidade de
suboperadores, que processam dados exclusivamente para prestar o serviço:

| Empresa | Serviço | Dados compartilhados | País |
|---|---|---|---|
| **Resend** (Resend Inc.) | Envio de e-mails transacionais | E-mail do destinatário, nome, conteúdo da mensagem | EUA |
| **Pusher** (Pusher Ltd.) | Mensagens em tempo real (chat do evento) | Mensagens do mural/chat, identificador de canal | Reino Unido |
| **Railway** (Railway Corp.) | Hospedagem e banco de dados | Todos os dados armazenados no banco | EUA |
| **Cloudflare** (Cloudflare Inc.) | CDN e proteção CAPTCHA (Turnstile) | Endereço IP, token de verificação | EUA |

> **TODO:** Verificar se Resend, Pusher e Railway assinaram cláusulas contratuais padrão (SCCs)
> para transferência internacional de dados conforme LGPD Art. 33.

Não vendemos, alugamos nem cedemos seus dados para nenhuma outra empresa.

---

## 5. Seus direitos como titular

Conforme a LGPD (Art. 18), você tem direito a:

- **Acessar** quais dados seus estão armazenados
- **Corrigir** dados incompletos ou desatualizados
- **Deletar** seus dados (direito ao esquecimento), observados os prazos legais de retenção
- **Exportar** seus dados em formato legível
- **Revogar** consentimentos dados (ex: opt-out de marketing)
- **Ser informado** sobre com quem seus dados são compartilhados
- **Opor-se** a tratamentos baseados em legítimo interesse

Para exercer qualquer um desses direitos, entre em contato em **contato@voem.app** com o assunto
"Direitos LGPD — [seu nome]". Responderemos em até 15 dias úteis.

---

## 6. Por quanto tempo mantemos seus dados

| Tipo de dado | Período de retenção |
|---|---|
| Dados do evento (RSVP, fotos, mural) | Até 90 dias após a data da cerimônia, depois deletados automaticamente |
| Dados de cadastro do organizador | Enquanto a conta estiver ativa + 30 dias após encerramento |
| Logs de auditoria e segurança | 2 anos (necessário para detecção de fraude e cumprimento legal) |
| Tokens de verificação de e-mail | Expiram em 24h |
| Tokens de redefinição de senha | Expiram em 30 minutos |

> **TODO:** Revisar e implementar job automatizado de deleção dos dados do evento 90 dias
> após a data do casamento (coluna `ceremonyDate` do Event).

---

## 7. Segurança

Adotamos as seguintes medidas técnicas para proteger seus dados:

- Senhas armazenadas como hash Argon2 (irreversível)
- Comunicação via HTTPS com HSTS
- Tokens de segurança em hash SHA-256 no banco
- Logs de auditoria para detectar acessos suspeitos
- Rate limiting em endpoints de autenticação
- Content Security Policy (CSP) para mitigar ataques XSS

---

## 8. Cookies e rastreamento

O Voem. utiliza:

- **Cookie de sessão** (`authjs.session-token`): necessário para manter você logado
- **Cookie de estado CSRF** (`authjs.csrf-token`): proteção contra CSRF

Não usamos cookies de rastreamento, analytics ou publicidade de terceiros.

---

## 9. Controlador e operador de dados

O **casal organizador do evento** é o controlador dos dados pessoais dos convidados coletados
via RSVP. O Voem. atua como operador de dados, processando-os conforme as instruções do
controlador e as finalidades descritas nesta política.

Para dados de cadastro dos próprios organizadores, o Voem. é o controlador.

> **TODO:** Definir razão social e CNPJ do controlador antes do lançamento.

---

## 10. Modificações desta política

Quando atualizarmos esta política, você será notificado ao acessar o painel e precisará
aceitar a nova versão para continuar usando a plataforma. A versão atual é sempre a publicada
em voem.app/privacidade.

---

## 11. Contato

**E-mail:** contato@voem.app *(a definir antes do lançamento)*  
**Assunto:** Privacidade / LGPD

---

**Versão 1.0** — Vigente desde 08 de maio de 2026
