import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 prose prose-neutral">
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>

      <p>
        <strong>[PLACEHOLDER]</strong> Este documento será substituído pelo
        texto definitivo antes do evento ser publicado. A política descreverá
        quais dados pessoais são coletados, por qual finalidade, com quem são
        compartilhados (Railway, Resend, Pusher), por quanto tempo são
        armazenados, e quais são os direitos do titular conforme a LGPD.
      </p>

      <h2>Controlador dos dados</h2>
      <p>
        Os organizadores de cada evento são os controladores dos dados dos seus
        convidados. Esta plataforma atua como operadora de dados.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você tem direito a acessar, corrigir e solicitar a exclusão dos seus
        dados pessoais. Para exercer esses direitos ou solicitar ser esquecido,
        entre em contato com os organizadores do evento.
      </p>
    </main>
  );
}
