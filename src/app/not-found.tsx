import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <p className="text-5xl">💍</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Este link não existe ou o evento foi removido.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
