"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function LegalModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 text-sm leading-relaxed text-muted-foreground prose prose-sm prose-neutral max-w-none">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button onClick={onClose} className="w-full h-10">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TermsContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">Vigente desde 8 de maio de 2026</p>
      <h3 className="font-semibold text-foreground mt-0">1. O que é o Voem.</h3>
      <p>O Voem. é uma plataforma digital que permite a casais criar convites interativos de casamento, gerenciar listas de convidados, coletar confirmações de presença (RSVP), receber mensagens no mural, organizar listas de presentes e compartilhar o roteiro do evento — tudo em um link único que os convidados acessam pelo celular, sem precisar instalar nada.</p>
      <h3 className="font-semibold text-foreground">2. Quem pode usar</h3>
      <ul>
        <li>Ter pelo menos 18 anos de idade</li>
        <li>Fornecer dados verdadeiros no cadastro (nome e e-mail)</li>
        <li>Aceitar estes Termos de Uso e a Política de Privacidade</li>
      </ul>
      <p>O uso por menores de 18 anos exige autorização de responsável legal. Convidados que acessam apenas a página pública do evento não precisam se cadastrar.</p>
      <h3 className="font-semibold text-foreground">3. Responsabilidades do casal</h3>
      <ul>
        <li>Todo o conteúdo publicado no evento (textos, fotos, informações de local e roteiro)</li>
        <li>Gerenciar quem tem acesso às ferramentas de moderação do mural e chat</li>
        <li>Garantir que os dados dos convidados coletados via RSVP sejam tratados com cuidado</li>
        <li>Não publicar informações falsas que possam induzir convidados a erro</li>
      </ul>
      <h3 className="font-semibold text-foreground">4. Responsabilidades da plataforma</h3>
      <ul>
        <li>Manter a plataforma funcionando com razoável disponibilidade</li>
        <li>Proteger os dados pessoais conforme a Política de Privacidade</li>
        <li>Notificar os usuários em caso de incidentes de segurança que afetem seus dados</li>
        <li>Manter backups regulares dos dados dos eventos</li>
      </ul>
      <h3 className="font-semibold text-foreground">5. Conduta proibida</h3>
      <ul>
        <li>Publicar conteúdo ofensivo, discriminatório ou violento</li>
        <li>Enviar spam ou comunicações não solicitadas para convidados</li>
        <li>Coletar dados de convidados para finalidades além da organização do evento</li>
        <li>Praticar fraude ou criar eventos fictícios para enganar pessoas</li>
        <li>Tentar acessar contas de outros usuários ou comprometer a segurança da plataforma</li>
      </ul>
      <h3 className="font-semibold text-foreground">6. Encerramento de conta</h3>
      <p><strong>Voluntário:</strong> Você pode encerrar sua conta a qualquer momento pelo painel ou entrando em contato em <strong>contato@joseeleticia.com</strong>. Para solicitar exclusão dos seus dados, entre em contato pelo mesmo e-mail. Os dados do evento são mantidos por até 90 dias após a data do casamento e então deletados.</p>
      <p><strong>Involuntário:</strong> A plataforma pode encerrar ou suspender sua conta em caso de violação destes termos, atividade suspeita de fraude ou determinação legal.</p>
      <h3 className="font-semibold text-foreground">7. Limitação de responsabilidade</h3>
      <p>Na máxima extensão permitida pela lei brasileira, o Voem. não será responsável por danos indiretos, lucros cessantes ou danos emergentes decorrentes do uso ou impossibilidade de uso da plataforma.</p>
      <h3 className="font-semibold text-foreground">8. Modificações dos termos</h3>
      <p>O Voem. pode atualizar estes termos a qualquer momento. Quando isso acontecer, você será notificado no painel ao fazer login e precisará aceitar os novos termos para continuar.</p>
      <h3 className="font-semibold text-foreground">9. Foro</h3>
      <p>As partes elegem o foro da Comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer disputas decorrentes destes termos.</p>
      <h3 className="font-semibold text-foreground">10. Contato</h3>
      <p>Dúvidas sobre estes termos? Entre em contato: <strong>contato@joseeleticia.com</strong></p>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">Vigente desde 8 de maio de 2026</p>
      <h3 className="font-semibold text-foreground mt-0">1. Dados que coletamos</h3>
      <p><strong>Dados de cadastro:</strong> nome, e-mail e senha (em hash irreversível).</p>
      <p><strong>Dados do evento:</strong> nomes do casal, data, local, roteiro, lista de presentes.</p>
      <p><strong>Dados dos convidados (via RSVP):</strong> nome, confirmação de presença, número de acompanhantes, restrições alimentares, mensagens no mural e chat, intenção de doação.</p>
      <p><strong>Dados técnicos:</strong> endereço IP (para rate limiting e segurança), logs de autenticação, data e hora de acesso às páginas administrativas.</p>
      <h3 className="font-semibold text-foreground">2. Para que usamos esses dados</h3>
      <ul>
        <li>Operação da plataforma e do evento (cadastro, RSVP, mural)</li>
        <li>Autenticação e segurança da conta</li>
        <li>Comunicação por e-mail (transacional)</li>
        <li>Moderação do mural e chat</li>
        <li>Suporte ao organizador</li>
        <li>Logs de auditoria e detecção de fraude</li>
      </ul>
      <p>Não usamos seus dados para publicidade de terceiros ou venda de perfis.</p>
      <h3 className="font-semibold text-foreground">3. Bases legais (LGPD)</h3>
      <ul>
        <li><strong>Execução de contrato:</strong> dados necessários para criar e gerenciar o evento</li>
        <li><strong>Consentimento:</strong> fotos e mídias enviadas ao mural; aceite de comunicações de marketing</li>
        <li><strong>Legítimo interesse:</strong> logs de auditoria e segurança</li>
        <li><strong>Cumprimento de obrigação legal:</strong> quando exigido por autoridade competente</li>
      </ul>
      <h3 className="font-semibold text-foreground">4. Compartilhamento com terceiros</h3>
      <p>Compartilhamos dados apenas com prestadores de serviço que processam dados exclusivamente para prestar o serviço: Resend (e-mails), Pusher (chat em tempo real), Railway (hospedagem e banco de dados), Cloudflare (CDN e CAPTCHA). Não vendemos nem cedemos seus dados para nenhuma outra empresa.</p>
      <h3 className="font-semibold text-foreground">5. Seus direitos como titular</h3>
      <p>Conforme a LGPD (Art. 18), você tem direito a acessar, corrigir, deletar, exportar e revogar seus dados. Para exercer qualquer um desses direitos ou solicitar exclusão dos seus dados, entre em contato em <strong>contato@joseeleticia.com</strong> com o assunto <em>Direitos LGPD — [seu nome]</em>. Responderemos em até 15 dias úteis.</p>
      <h3 className="font-semibold text-foreground">6. Por quanto tempo mantemos seus dados</h3>
      <ul>
        <li>Dados do evento (RSVP, fotos, mural): até 90 dias após a cerimônia</li>
        <li>Dados de cadastro: enquanto a conta estiver ativa + 30 dias após encerramento</li>
        <li>Logs de auditoria e segurança: 2 anos</li>
        <li>Tokens de verificação de e-mail: 24 horas</li>
      </ul>
      <h3 className="font-semibold text-foreground">7. Segurança</h3>
      <p>Senhas em hash Argon2, HTTPS com HSTS, tokens em hash SHA-256, logs de auditoria, rate limiting e Content Security Policy.</p>
      <h3 className="font-semibold text-foreground">8. Cookies</h3>
      <p>Utilizamos apenas o cookie de sessão (<code>authjs.session-token</code>) e o cookie de proteção CSRF (<code>authjs.csrf-token</code>). Nenhum cookie de rastreamento ou publicidade.</p>
      <h3 className="font-semibold text-foreground">9. Controlador e operador de dados</h3>
      <p>O casal organizador é o controlador dos dados dos convidados coletados via RSVP. O Voem. atua como operador. Para dados de cadastro dos organizadores, o Voem. é o controlador.</p>
      <h3 className="font-semibold text-foreground">10. Contato</h3>
      <p>E-mail: <strong>contato@joseeleticia.com</strong> · Assunto: Privacidade / LGPD</p>
    </>
  );
}
