'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { loginAction, signupAction } from '@/app/(auth)/login/actions';
import { getPasswordScore } from '@/lib/auth/validate-password';
import { TurnstileWidget } from './turnstile-widget';

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

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const score = getPasswordScore(password);
  const colors = [
    'bg-red-500',
    'bg-orange-400',
    'bg-yellow-400',
    'bg-green-400',
    'bg-green-600',
  ];
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Excelente'];
  const filled = colors[score];

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? filled : 'bg-border'}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
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
    await signIn('resend', { email, redirect: false });
    setMagicPending(false);
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

function SignupForm({ turnstileToken }: { turnstileToken: string | null }) {
  const form = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line react-hooks/incompatible-library
  const password = form.watch('password') ?? '';

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

      {form.formState.errors.root && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {form.formState.errors.root.message}
        </p>
      )}

      <Button type="submit" className="mt-1 w-full h-12 text-base" disabled={isPending}>
        {isPending ? 'Criando conta…' : 'Criar conta'}
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function AuthTabs({ defaultTab = 'login' }: { defaultTab?: 'login' | 'signup' }) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  return (
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
        <SignupForm turnstileToken={turnstileToken} />
      </TabsContent>

      {/* Widget vive fora das abas para não desmontar ao trocar de aba */}
      <div className="mt-4">
        <TurnstileWidget onToken={setTurnstileToken} />
      </div>
    </Tabs>
  );
}
