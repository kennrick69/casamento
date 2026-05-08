import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-2 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
          v{PRIVACY_VERSION}
        </span>
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          TODO: revisão jurídica antes do lançamento
        </span>
      </div>

      <h1>Política de Privacidade</h1>
      <p className="lead">Vigente desde 8 de maio de 2026 · Versão {PRIVACY_VERSION}</p>

      <h2>1. Dados que coletamos</h2>

      <h3>Dados de cadastro (organizadores)</h3>
      <ul>
        <li>Nome e sobrenome</li>
        <li>Endereço de e-mail</li>
        <li>Telefone (opcional)</li>
        <li>Senha (armazenada em hash irreversível — nunca em texto puro)</li>
      </ul>

      <h3>Dados do evento</h3>
      <ul>
        <li>Nomes do casal, data e local da cerimônia e recepção</li>
        <li>Roteiro detalhado do evento</li>
        <li>Lista de presentes e URLs externos de loja</li>
      </ul>

      <h3>Dados dos convidados (via RSVP)</h3>
      <ul>
        <li>Nome</li>
        <li>Confirmação de presença e número de acompanhantes</li>
        <li>Restrições alimentares e necessidades de acessibilidade (quando informadas)</li>
        <li>Mensagens enviadas ao mural e chat do evento</li>
        <li>Declarações de intenção de doação (valor e forma de pagamento)</li>
      </ul>

      <h3>Dados técnicos</h3>
      <ul>
        <li>Endereço IP (usado para rate limiting e logs de segurança)</li>
        <li>Logs de autenticação: tentativas de login, trocas de senha, verificação de e-mail</li>
        <li>Data e hora de acesso às páginas administrativas</li>
      </ul>

      <h2>2. Para que usamos esses dados</h2>
      <table>
        <thead>
          <tr><th>Finalidade</th><th>Dados usados</th></tr>
        </thead>
        <tbody>
          <tr><td>Operação da plataforma e do evento</td><td>Cadastro, evento, RSVP</td></tr>
          <tr><td>Autenticação e segurança da conta</td><td>E-mail, senha (hash), IP, logs</td></tr>
          <tr><td>Comunicação por e-mail</td><td>E-mail</td></tr>
          <tr><td>Moderação do mural e chat</td><td>Mensagens, nome do convidado</td></tr>
          <tr><td>Suporte ao organizador</td><td>Dados de cadastro</td></tr>
          <tr><td>Logs de auditoria e detecção de fraude</td><td>IP, logs de autenticação</td></tr>
        </tbody>
      </table>
      <p>Não usamos seus dados para publicidade de terceiros ou venda de perfis.</p>

      <h2>3. Bases legais (LGPD — Lei 13.709/2018)</h2>
      <ul>
        <li>
          <strong>Execução de contrato</strong> (Art. 7°, V): dados necessários para criar e gerenciar o evento
        </li>
        <li>
          <strong>Consentimento</strong> (Art. 7°, I): fotos e mídias enviadas ao mural; aceite de
          comunicações de marketing (opcional, pode ser revogado a qualquer momento)
        </li>
        <li>
          <strong>Legítimo interesse</strong> (Art. 7°, IX): logs de auditoria e segurança para proteção
          da plataforma e dos usuários
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> (Art. 7°, II): quando exigido por autoridade
          competente
        </li>
      </ul>

      <h2>4. Compartilhamento com terceiros</h2>
      <p>
        Compartilhamos dados <strong>apenas</strong> com os seguintes prestadores de serviço
        (suboperadores), que processam dados exclusivamente para prestar o serviço:
      </p>
      <table>
        <thead>
          <tr><th>Empresa</th><th>Serviço</th><th>Dados compartilhados</th><th>País</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Resend</strong></td>
            <td>Envio de e-mails transacionais</td>
            <td>E-mail, nome, conteúdo da mensagem</td>
            <td>EUA</td>
          </tr>
          <tr>
            <td><strong>Pusher</strong></td>
            <td>Mensagens em tempo real (chat)</td>
            <td>Mensagens do mural/chat, identificador de canal</td>
            <td>Reino Unido</td>
          </tr>
          <tr>
            <td><strong>Railway</strong></td>
            <td>Hospedagem e banco de dados</td>
            <td>Todos os dados armazenados</td>
            <td>EUA</td>
          </tr>
          <tr>
            <td><strong>Cloudflare</strong></td>
            <td>CDN e proteção CAPTCHA (Turnstile)</td>
            <td>Endereço IP, token de verificação</td>
            <td>EUA</td>
          </tr>
        </tbody>
      </table>
      <p>Não vendemos, alugamos nem cedemos seus dados para nenhuma outra empresa.</p>

      <h2>5. Seus direitos como titular</h2>
      <p>Conforme a LGPD (Art. 18), você tem direito a:</p>
      <ul>
        <li><strong>Acessar</strong> quais dados seus estão armazenados</li>
        <li><strong>Corrigir</strong> dados incompletos ou desatualizados</li>
        <li><strong>Deletar</strong> seus dados, observados os prazos legais de retenção</li>
        <li><strong>Exportar</strong> seus dados em formato legível</li>
        <li><strong>Revogar</strong> consentimentos dados (ex: opt-out de marketing)</li>
        <li><strong>Ser informado</strong> sobre com quem seus dados são compartilhados</li>
        <li><strong>Opor-se</strong> a tratamentos baseados em legítimo interesse</li>
      </ul>
      <p>
        Para exercer qualquer um desses direitos, entre em contato em <strong>contato@voem.app</strong>{" "}
        com o assunto <em>Direitos LGPD — [seu nome]</em>. Responderemos em até 15 dias úteis.
      </p>

      <h2>6. Por quanto tempo mantemos seus dados</h2>
      <table>
        <thead>
          <tr><th>Tipo de dado</th><th>Período de retenção</th></tr>
        </thead>
        <tbody>
          <tr><td>Dados do evento (RSVP, fotos, mural)</td><td>Até 90 dias após a data da cerimônia</td></tr>
          <tr><td>Dados de cadastro do organizador</td><td>Enquanto a conta estiver ativa + 30 dias após encerramento</td></tr>
          <tr><td>Logs de auditoria e segurança</td><td>2 anos</td></tr>
          <tr><td>Tokens de verificação de e-mail</td><td>24 horas</td></tr>
          <tr><td>Tokens de redefinição de senha</td><td>30 minutos</td></tr>
        </tbody>
      </table>

      <h2>7. Segurança</h2>
      <p>Adotamos as seguintes medidas técnicas para proteger seus dados:</p>
      <ul>
        <li>Senhas armazenadas como hash Argon2 (irreversível)</li>
        <li>Comunicação via HTTPS com HSTS obrigatório</li>
        <li>Tokens de segurança em hash SHA-256 no banco</li>
        <li>Logs de auditoria para detectar acessos suspeitos</li>
        <li>Rate limiting em endpoints de autenticação</li>
        <li>Content Security Policy (CSP) para mitigar ataques XSS</li>
      </ul>

      <h2>8. Cookies</h2>
      <p>O Voem. utiliza apenas:</p>
      <ul>
        <li>
          <strong>Cookie de sessão</strong> (mantém você conectado entre páginas — nome técnico: <code>authjs.session-token</code>): necessário para
          manter você logado. Expira com a sessão do navegador ou em 30 dias.
        </li>
        <li>
          <strong>Cookie de estado CSRF</strong> (<code>authjs.csrf-token</code>): proteção contra
          ataques cross-site.
        </li>
      </ul>
      <p>Não usamos cookies de rastreamento, analytics ou publicidade de terceiros.</p>

      <h2>9. Controlador e operador de dados</h2>
      <p>
        O <strong>casal organizador do evento</strong> é o controlador dos dados pessoais dos
        convidados coletados via RSVP. O Voem. atua como operador de dados, processando-os conforme
        as instruções do controlador e as finalidades descritas nesta política.
      </p>
      <p>
        Para dados de cadastro dos próprios organizadores, o Voem. é o controlador.
      </p>

      <h2>10. Modificações desta política</h2>
      <p>
        Quando atualizarmos esta política, você será notificado ao acessar o painel e precisará
        aceitar a nova versão para continuar usando a plataforma. A versão atual é sempre a publicada
        nesta página.
      </p>

      <h2>11. Contato</h2>
      <p>
        <strong>E-mail:</strong> contato@voem.app<br />
        <strong>Assunto:</strong> Privacidade / LGPD
      </p>

      <hr />
      <p className="text-sm text-muted-foreground not-prose mt-6">
        Versão {PRIVACY_VERSION} · Vigente desde 8 de maio de 2026 ·{" "}
        <Link href="/termos" className="underline underline-offset-2">Termos de Uso</Link>
      </p>
    </main>
  );
}
