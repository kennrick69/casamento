import type { Metadata } from "next";
import Link from "next/link";
import { TERMS_VERSION } from "@/lib/legal/versions";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 prose prose-neutral dark:prose-invert">
      <div className="not-prose mb-2 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Início</Link>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-mono">
          v{TERMS_VERSION}
        </span>
        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          TODO: revisão jurídica antes do lançamento
        </span>
      </div>

      <h1>Termos de Uso</h1>
      <p className="lead">Vigente desde 8 de maio de 2026 · Versão {TERMS_VERSION}</p>

      <h2>1. O que é o Voem.</h2>
      <p>
        O Voem. é uma plataforma digital que permite a casais criar convites interativos de casamento,
        gerenciar listas de convidados, coletar confirmações de presença (RSVP), receber mensagens no
        mural, organizar listas de presentes e compartilhar o roteiro do evento — tudo em um link único
        que os convidados acessam pelo celular, sem precisar instalar nada.
      </p>

      <h2>2. Quem pode usar</h2>
      <p>Para criar um evento no Voem., você precisa:</p>
      <ul>
        <li>Ter pelo menos 18 anos de idade</li>
        <li>Fornecer dados verdadeiros no cadastro (nome e e-mail)</li>
        <li>Aceitar estes Termos de Uso e a Política de Privacidade</li>
      </ul>
      <p>
        O uso por menores de 18 anos exige autorização de responsável legal. Convidados que acessam
        apenas a página pública do evento não precisam se cadastrar.
      </p>

      <h2>3. Responsabilidades do casal</h2>
      <p>Ao criar um evento, o casal é responsável por:</p>
      <ul>
        <li>Todo o conteúdo publicado no evento (textos, fotos, informações de local e roteiro)</li>
        <li>Gerenciar quem tem acesso às ferramentas de moderação do mural e chat</li>
        <li>Garantir que os dados dos convidados coletados via RSVP sejam tratados com cuidado</li>
        <li>Não publicar informações falsas que possam induzir convidados a erro</li>
      </ul>

      <h2>4. Responsabilidades da plataforma</h2>
      <p>O Voem. se compromete a:</p>
      <ul>
        <li>Manter a plataforma funcionando com razoável disponibilidade (sem garantia de 100% de uptime)</li>
        <li>Proteger os dados pessoais conforme descrito na <Link href="/privacidade">Política de Privacidade</Link></li>
        <li>Notificar os usuários em caso de incidentes de segurança que afetem seus dados</li>
        <li>Manter backups regulares dos dados dos eventos</li>
      </ul>
      <p>
        A plataforma <strong>não se responsabiliza</strong> por falhas temporárias de serviço causadas
        por manutenção ou eventos de força maior, por conteúdo enviado por usuários ou convidados, nem
        por perdas decorrentes do uso indevido das ferramentas disponibilizadas.
      </p>

      <h2>5. Conduta proibida</h2>
      <p>É expressamente proibido usar o Voem. para:</p>
      <ul>
        <li>Publicar conteúdo ofensivo, discriminatório, violento ou que viole direitos de terceiros</li>
        <li>Enviar spam ou comunicações não solicitadas para convidados</li>
        <li>Coletar dados de convidados para finalidades além da organização do evento</li>
        <li>Praticar fraude ou criar eventos fictícios com o objetivo de enganar pessoas</li>
        <li>Tentar acessar contas de outros usuários ou comprometer a segurança da plataforma</li>
        <li>Usar a plataforma para atividades ilegais conforme a legislação brasileira</li>
      </ul>
      <p>O descumprimento pode resultar em encerramento imediato da conta.</p>

      <h2>6. Encerramento de conta</h2>
      <p>
        <strong>Voluntário:</strong> Você pode solicitar o encerramento da sua conta a qualquer momento
        pelo painel ou entrando em contato pelo e-mail da plataforma. Os dados do evento serão mantidos
        por até 90 dias após a data do casamento e então deletados.
      </p>
      <p>
        <strong>Involuntário:</strong> A plataforma pode encerrar ou suspender sua conta sem aviso prévio
        em caso de violação destes termos, atividade suspeita de fraude ou determinação legal.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei brasileira, o Voem. não será responsável por danos
        indiretos, lucros cessantes ou danos emergentes decorrentes do uso ou impossibilidade de uso
        da plataforma.
      </p>

      <h2>8. Modificações dos termos</h2>
      <p>
        O Voem. pode atualizar estes termos a qualquer momento. Quando isso acontecer, você será
        notificado no próprio painel ao fazer login e precisará aceitar os novos termos para continuar
        usando o painel de organização. A data de vigência será atualizada neste documento.
      </p>

      <h2>9. Foro</h2>
      <p>
        As partes elegem o foro da Comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer
        disputas decorrentes destes termos, renunciando a qualquer outro, por mais privilegiado que seja.
      </p>

      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes termos? Entre em contato: <strong>contato@voem.app</strong>
      </p>

      <hr />
      <p className="text-sm text-muted-foreground not-prose mt-6">
        Versão {TERMS_VERSION} · Vigente desde 8 de maio de 2026 ·{" "}
        <Link href="/privacidade" className="underline underline-offset-2">Política de Privacidade</Link>
      </p>
    </main>
  );
}
