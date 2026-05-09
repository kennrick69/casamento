'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { loginAction, signupAction, requestMagicLinkAction } from '@/app/(auth)/login/actions';
import { TurnstileWidget } from './turnstile-widget';
import { PasswordStrengthBar } from './password-strength-bar';

import Link from 'next/link';

const CF_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Schemas (client-side validation)
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'Mínimo 2 letras').max(50),
    lastName: z.string().min(2, 'Mínimo 2 letras').max(50),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
    termsAccepted: z.boolean().refine((v) => v, { message: 'Aceite os Termos de Uso.' }),
    privacyAccepted: z.boolean().refine((v) => v, { message: 'Aceite a Política de Privacidade.' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

type LoginInput = z.infer<typeof loginSchema>;
type SignupInput = z.infer<typeof signupSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login form
// ─────────────────────────────────────────────────────────────────────────────

function LoginForm({ turnstileToken }: { turnstileToken: string | null }) {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const [isPending, startTransition] = useTransition();
  const [magicPending, setMagicPending] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const onSubmit = form.handleSubmit((data) => {
    if (CF_SITE_KEY && !turnstileToken) {
      form.setError('root', { message: 'Complete a verificação de segurança.' });
      return;
    }

    const fd = new FormData();
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('website', ''); // honeypot — vazio em submissão legítima
    fd.append('cf-turnstile-response', turnstileToken ?? '');

    startTransition(async () => {
      const result = await loginAction(fd);
      if (result?.error) {
        if (result.field === 'password') {
          form.setError('password', { message: result.error });
        } else {
          form.setError('root', { message: result.error });
        }
      }
    });
  });

  async function handleMagicLink() {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { message: 'Informe seu e-mail para receber o link.' });
      return;
    }
    setMagicPending(true);
    const fd = new FormData();
    fd.append('email', email);
    const result = await requestMagicLinkAction(fd);
    setMagicPending(false);
    if (result && 'error' in result) {
      form.setError('email', { message: result.error });
      return;
    }
    setMagicSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Honeypot — invisível para humanos */}
      <div aria-hidden="true" className="absolute -top-[9999px] left-0">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          aria-invalid={!!form.formState.errors.email}
          className="h-12 text-base"
          {...form.register('email')}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={!!form.formState.errors.password}
          className="h-12 text-base"
          {...form.register('password')}
        />
        <FieldError message={form.formState.errors.password?.message} />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Esqueci minha senha
          </Link>
        </div>
      </div>

      {form.formState.errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit" className="mt-1 w-full h-12 text-base" disabled={isPending}>
        {isPending ? 'Entrando…' : 'Entrar'}
      </Button>

      {/* Magic link fallback */}
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {magicSent ? (
        <p className="text-center text-sm text-muted-foreground">
          Link enviado! Verifique sua caixa de entrada.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={magicPending}
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground disabled:opacity-50"
        >
          {magicPending ? 'Enviando link…' : 'Acessar sem senha'}
        </button>
      )}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup form
// ─────────────────────────────────────────────────────────────────────────────

function SignupForm({ turnstileToken, onOpenTerms, onOpenPrivacy }: {
  turnstileToken: string | null;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { termsAccepted: false, privacyAccepted: false },
  });
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line react-hooks/incompatible-library
  const password = form.watch('password') ?? '';
  const termsAccepted = form.watch('termsAccepted');
  const privacyAccepted = form.watch('privacyAccepted');

  const onSubmit = form.handleSubmit((data) => {
    if (CF_SITE_KEY && !turnstileToken) {
      form.setError('root', { message: 'Complete a verificação de segurança.' });
      return;
    }

    const fd = new FormData();
    fd.append('firstName', data.firstName);
    fd.append('lastName', data.lastName);
    fd.append('email', data.email);
    fd.append('password', data.password);
    fd.append('termsAccepted', String(data.termsAccepted));
    fd.append('privacyAccepted', String(data.privacyAccepted));
    fd.append('website', ''); // honeypot
    fd.append('cf-turnstile-response', turnstileToken ?? '');

    startTransition(async () => {
      const result = await signupAction(fd);
      if (result?.error) {
        const field = result.field as keyof SignupInput | undefined;
        if (field && field in form.getValues()) {
          form.setError(field, { message: result.error });
        } else {
          form.setError('root', { message: result.error });
        }
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -top-[9999px] left-0">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="signup-firstName">Nome</Label>
          <Input
            id="signup-firstName"
            type="text"
            placeholder="Ana"
            autoComplete="given-name"
            aria-invalid={!!form.formState.errors.firstName}
            className="h-12 text-base"
            {...form.register('firstName')}
          />
          <FieldError message={form.formState.errors.firstName?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-lastName">Sobrenome</Label>
          <Input
            id="signup-lastName"
            type="text"
            placeholder="Silva"
            autoComplete="family-name"
            aria-invalid={!!form.formState.errors.lastName}
            className="h-12 text-base"
            {...form.register('lastName')}
          />
          <FieldError message={form.formState.errors.lastName?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          aria-invalid={!!form.formState.errors.email}
          className="h-12 text-base"
          {...form.register('email')}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!form.formState.errors.password}
          className="h-12 text-base"
          {...form.register('password')}
        />
        <PasswordStrengthBar password={password} />
        <FieldError message={form.formState.errors.password?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-confirmPassword">Confirmar senha</Label>
        <Input
          id="signup-confirmPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={!!form.formState.errors.confirmPassword}
          className="h-12 text-base"
          {...form.register('confirmPassword')}
        />
        <FieldError message={form.formState.errors.confirmPassword?.message} />
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            {...form.register('termsAccepted')}
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            Li e aceito os{' '}
            <button
              type="button"
              onClick={onOpenTerms}
              className="underline underline-offset-2 text-foreground hover:text-primary"
            >
              Termos de Uso
            </button>
          </span>
        </label>
        {form.formState.errors.termsAccepted && (
          <p className="text-xs text-destructive ml-6">{form.formState.errors.termsAccepted.message}</p>
        )}

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            {...form.register('privacyAccepted')}
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            Li e aceito a{' '}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="underline underline-offset-2 text-foreground hover:text-primary"
            >
              Política de Privacidade
            </button>
          </span>
        </label>
        {form.formState.errors.privacyAccepted && (
          <p className="text-xs text-destructive ml-6">{form.formState.errors.privacyAccepted.message}</p>
        )}
      </div>

      {form.formState.errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        className="mt-1 w-full h-12 text-base"
        disabled={isPending || !termsAccepted || !privacyAccepted}
      >
        {isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal legal (Termos / Privacidade)
// ─────────────────────────────────────────────────────────────────────────────

function LegalModal({
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
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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

function TermsContent() {
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

function PrivacyContent() {
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

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function AuthTabs({ defaultTab = 'login' }: { defaultTab?: 'login' | 'signup' }) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="w-full">
          <TabsTrigger value="login" className="flex-1">
            Entrar
          </TabsTrigger>
          <TabsTrigger value="signup" className="flex-1">
            Criar conta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-5">
          <LoginForm turnstileToken={turnstileToken} />
        </TabsContent>

        <TabsContent value="signup" className="mt-5">
          <SignupForm
            turnstileToken={turnstileToken}
            onOpenTerms={() => setTermsOpen(true)}
            onOpenPrivacy={() => setPrivacyOpen(true)}
          />
        </TabsContent>

        {/* Widget vive fora das abas para não desmontar ao trocar de aba */}
        <div className="mt-4">
          <TurnstileWidget onToken={setTurnstileToken} />
        </div>
      </Tabs>

      <LegalModal open={termsOpen} onClose={() => setTermsOpen(false)} title="Termos de Uso">
        <TermsContent />
      </LegalModal>

      <LegalModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Política de Privacidade">
        <PrivacyContent />
      </LegalModal>
    </>
  );
}
