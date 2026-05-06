import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 prose prose-neutral">
      <h1>Termos de Uso</h1>
      <p className="text-sm text-muted-foreground">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>

      <p>
        <strong>[PLACEHOLDER]</strong> Este documento será substituído pelo
        texto definitivo antes do evento ser publicado. Os termos descreverão
        as condições de uso da plataforma, as responsabilidades dos
        organizadores e dos convidados, as regras de conduta e a isenção de
        responsabilidade da plataforma.
      </p>

      <h2>Uso da plataforma</h2>
      <p>
        Esta plataforma é disponibilizada gratuitamente para organização de
        eventos. O conteúdo enviado pelos usuários é de responsabilidade de
        quem o envia.
      </p>

      <h2>Conduta</h2>
      <p>
        É proibido o envio de conteúdo ofensivo, violento, ou que viole
        direitos de terceiros. Os organizadores têm ferramentas de moderação
        para remover conteúdo inadequado.
      </p>
    </main>
  );
}
