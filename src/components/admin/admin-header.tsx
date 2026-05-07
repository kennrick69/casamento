import Link from "next/link";

export function AdminHeader({
  title,
  subtitle,
  backHref = "/admin",
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="border-b bg-background px-6 py-4 flex items-center justify-between">
      <div>
        {backHref && (
          <Link href={backHref} className="text-xs text-muted-foreground hover:text-foreground block mb-0.5">
            ← Meus eventos
          </Link>
        )}
        <h1 className="font-semibold">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/api/auth/signout" className="hover:text-foreground transition-colors">
          Sair
        </Link>
      </div>
    </header>
  );
}
